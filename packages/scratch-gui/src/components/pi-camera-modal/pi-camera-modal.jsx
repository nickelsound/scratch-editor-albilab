import PropTypes from 'prop-types';
import React, {useEffect, useState} from 'react';
import {defineMessages, FormattedMessage, useIntl} from 'react-intl';
import Modal from '../../containers/modal.jsx';
import Box from '../box/box.jsx';

import styles from './pi-camera-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Pi Camera',
        description: 'Title of the Pi Camera modal',
        id: 'gui.piCameraModal.title'
    },
    capture: {
        defaultMessage: 'Capture preview',
        description: 'Button to capture a camera preview',
        id: 'gui.piCameraModal.capture'
    },
    analyze: {
        defaultMessage: 'Capture and check flower',
        description: 'Button to capture an image and check it for a flower',
        id: 'gui.piCameraModal.analyze'
    },
    ready: {
        defaultMessage: 'Ready.',
        description: 'Pi Camera modal status when no request is running',
        id: 'gui.piCameraModal.ready'
    },
    capturing: {
        defaultMessage: 'Capturing image…',
        description: 'Pi Camera modal status while capturing a preview',
        id: 'gui.piCameraModal.capturing'
    },
    analyzing: {
        defaultMessage: 'Capturing image and sending it for analysis…',
        description: 'Pi Camera modal status while analyzing a flower',
        id: 'gui.piCameraModal.analyzing'
    },
    flowerFound: {
        defaultMessage: 'Flower found',
        description: 'Pi Camera flower detection result',
        id: 'gui.piCameraModal.flowerFound'
    },
    noFlowerFound: {
        defaultMessage: 'No flower found',
        description: 'Pi Camera non-flowering detection result',
        id: 'gui.piCameraModal.noFlowerFound'
    },
    unknownResult: {
        defaultMessage: 'No result available',
        description: 'Pi Camera result when no prediction is available',
        id: 'gui.piCameraModal.unknownResult'
    },
    confidence: {
        defaultMessage: 'Confidence',
        description: 'Label for flower detection confidence',
        id: 'gui.piCameraModal.confidence'
    },
    error: {
        defaultMessage: 'Error',
        description: 'Pi Camera modal error label',
        id: 'gui.piCameraModal.error'
    },
    preview: {
        defaultMessage: 'Camera preview',
        description: 'Alternative text for Pi Camera preview image',
        id: 'gui.piCameraModal.preview'
    }
});

const getJsonResponse = async response => {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch (error) {
        return {error: text || error.message};
    }
};

const getBlocks = payload => payload && payload.result && payload.result.blocks;

const PiCameraModal = props => {
    const intl = useIntl();
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('ready');
    const [error, setError] = useState('');
    const [blocks, setBlocks] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    useEffect(() => {
        fetch('/api/flower/last', {cache: 'no-store'})
            .then(getJsonResponse)
            .then(payload => setBlocks(getBlocks(payload) || null))
            .catch(() => {});
    }, []);

    useEffect(() => () => {
        if (previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
    }, [previewUrl]);

    const showError = message => {
        setError(message);
        setStatus('error');
    };

    const handleCapture = async () => {
        setBusy(true);
        setError('');
        setBlocks(null);
        setStatus('capturing');
        try {
            const response = await fetch('/pi-kamera/capture', {cache: 'no-store', method: 'POST'});
            if (!response.ok) {
                const payload = await getJsonResponse(response);
                throw new Error(payload.error || `HTTP ${response.status}`);
            }
            setPreviewUrl(URL.createObjectURL(await response.blob()));
            setStatus('ready');
        } catch (captureError) {
            showError(captureError.message);
        } finally {
            setBusy(false);
        }
    };

    const handleAnalyze = async () => {
        setBusy(true);
        setError('');
        setStatus('analyzing');
        try {
            const response = await fetch('/api/flower/analyze', {cache: 'no-store', method: 'POST'});
            const payload = await getJsonResponse(response);
            if (!response.ok || !payload.success) {
                throw new Error(payload.error || `HTTP ${response.status}`);
            }
            setBlocks(getBlocks(payload) || null);
            setPreviewUrl(`/api/flower/image?v=${Date.now()}`);
            setStatus('ready');
        } catch (analyzeError) {
            showError(analyzeError.message);
        } finally {
            setBusy(false);
        }
    };

    const resultLabel = !blocks ? '' : intl.formatMessage(
        blocks.last_label === 'flower_visible' ? messages.flowerFound :
            (blocks.last_label === 'no_flower' ? messages.noFlowerFound : messages.unknownResult)
    );

    return (
        <Modal
            id="pi-camera"
            className={styles.modalContent}
            contentLabel={intl.formatMessage(messages.title)}
            onRequestClose={props.onRequestClose}
        >
            <Box className={styles.body}>
                <div className={styles.panel}>
                    <div className={styles.actions}>
                        <button className={styles.secondaryButton} disabled={busy} onClick={handleCapture}>
                            <FormattedMessage {...messages.capture} />
                        </button>
                        <button className={styles.primaryButton} disabled={busy} onClick={handleAnalyze}>
                            <FormattedMessage {...messages.analyze} />
                        </button>
                    </div>
                    <p className={styles.status} role="status">
                        {status === 'error' ? <FormattedMessage {...messages.error} /> : <FormattedMessage {...messages[status]} />}
                        {error ? `: ${error}` : ''}
                    </p>
                    {blocks ? (
                        <p className={styles.result}>
                            {`${resultLabel} — ${intl.formatMessage(messages.confidence)}: ${Number(blocks.flower_confidence || 0)}%`}
                        </p>
                    ) : null}
                    {previewUrl ? <img alt={intl.formatMessage(messages.preview)} className={styles.image} src={previewUrl} /> : null}
                </div>
            </Box>
        </Modal>
    );
};

PiCameraModal.propTypes = {
    onRequestClose: PropTypes.func.isRequired
};

export default PiCameraModal;
