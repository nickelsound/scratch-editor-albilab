import React, {useState, useEffect} from 'react';
import {FormattedMessage, defineMessages, useIntl} from 'react-intl';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import styles from './landscape-overlay.css';

const messages = defineMessages({
    rotateDevice: {
        id: 'gui.landscapeOverlay.rotateDevice',
        defaultMessage: 'Rotate device to landscape',
        description: 'Message asking user to rotate device to landscape orientation'
    },
    bestExperience: {
        id: 'gui.landscapeOverlay.bestExperience',
        defaultMessage: 'For the best experience use landscape mode',
        description: 'Submessage about using landscape mode'
    },
    continuePortrait: {
        id: 'gui.landscapeOverlay.continuePortrait',
        defaultMessage: 'Continue in portrait mode',
        description: 'Button to continue viewing in portrait mode'
    }
});

const LandscapeOverlay = () => {
    const intl = useIntl();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        const checkOrientation = () => {
            if (isDismissed) {
                setIsVisible(false);
                return;
            }
            
            const isPortrait = window.innerHeight > window.innerWidth;
            // Only show on actual mobile devices, not desktop
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isSmallScreen = window.innerWidth <= 768;
            
            // Only show overlay on mobile devices in portrait mode, or small screens in portrait
            setIsVisible(isPortrait && (isMobile || isSmallScreen));
        };

        // Check on load
        checkOrientation();

        // Check on orientation change
        window.addEventListener('orientationchange', () => {
            setTimeout(checkOrientation, 100);
        });

        // Check on resize (for Chrome DevTools)
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(checkOrientation, 100);
        });

        return () => {
            window.removeEventListener('orientationchange', checkOrientation);
            window.removeEventListener('resize', checkOrientation);
            clearTimeout(resizeTimeout);
        };
    }, [isDismissed]);

    const handleDismiss = () => {
        setIsDismissed(true);
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <div className={styles.icon}>📱</div>
                <div className={styles.message}>
                    <FormattedMessage {...messages.rotateDevice} />
                </div>
                <div className={styles.submessage}>
                    <FormattedMessage {...messages.bestExperience} />
                </div>
                <button
                    className={styles.dismissButton}
                    onClick={handleDismiss}
                >
                    <FormattedMessage {...messages.continuePortrait} />
                </button>
            </div>
        </div>
    );
};

LandscapeOverlay.propTypes = {};

export default LandscapeOverlay;

