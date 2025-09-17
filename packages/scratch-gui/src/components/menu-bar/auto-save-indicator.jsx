import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

import styles from './menu-bar.css';

const messages = defineMessages({
    saving: {
        id: 'gui.menuBar.autoSave.saving',
        defaultMessage: 'Ukládám...',
        description: 'Auto-save indicator when saving'
    },
    saved: {
        id: 'gui.menuBar.autoSave.saved',
        defaultMessage: 'Uloženo',
        description: 'Auto-save indicator when saved'
    },
    error: {
        id: 'gui.menuBar.autoSave.error',
        defaultMessage: 'Chyba ukládání',
        description: 'Auto-save indicator when error'
    },
    lastSaved: {
        id: 'gui.menuBar.autoSave.lastSaved',
        defaultMessage: 'Naposledy uloženo: {time}',
        description: 'Auto-save indicator with last save time'
    }
});

const AutoSaveIndicator = function (props) {
    const {
        className,
        intl,
        isSaving,
        lastSaveTime,
        saveError,
        ...componentProps
    } = props;

    const getStatusMessage = () => {
        if (isSaving) {
            return intl.formatMessage(messages.saving);
        } else if (saveError) {
            return intl.formatMessage(messages.error);
        } else if (lastSaveTime) {
            return intl.formatMessage(messages.lastSaved, {
                time: formatLastSaveTime(lastSaveTime)
            });
        } else {
            return '';
        }
    };

    const getStatusIcon = () => {
        if (isSaving) {
            return '⏳';
        } else if (saveError) {
            return '❌';
        } else if (lastSaveTime) {
            return '✅';
        } else {
            return '';
        }
    };

    const handleManageClick = () => {
        // Vyvolej event pro otevření manageru
        window.dispatchEvent(new CustomEvent('openAutoSaveManager'));
    };

    const formatLastSaveTime = (time) => {
        if (!time) return '';
        
        const now = new Date();
        const saveTime = new Date(time);
        const diffMs = now - saveTime;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) {
            return 'právě teď';
        } else if (diffMins < 60) {
            return `před ${diffMins} min`;
        } else {
            const diffHours = Math.floor(diffMins / 60);
            return `před ${diffHours} h`;
        }
    };

    return (
        <div
            className={classNames(
                className,
                styles.autoSaveIndicator,
                {
                    [styles.autoSaveIndicatorSaving]: isSaving,
                    [styles.autoSaveIndicatorSaved]: lastSaveTime && !isSaving && !saveError,
                    [styles.autoSaveIndicatorError]: saveError
                }
            )}
            title={lastSaveTime ? intl.formatMessage(messages.lastSaved, {
                time: formatLastSaveTime(lastSaveTime)
            }) : ''}
            {...componentProps}
        >
            <span className={styles.autoSaveIcon}>
                {getStatusIcon()}
            </span>
            <span className={styles.autoSaveText}>
                {getStatusMessage()}
            </span>
            {lastSaveTime && (
                <button
                    className={styles.autoSaveManageButton}
                    onClick={handleManageClick}
                    title="Spravovat automaticky uložené projekty"
                >
                    📁
                </button>
            )}
        </div>
    );
};

AutoSaveIndicator.propTypes = {
    className: PropTypes.string,
    intl: intlShape.isRequired,
    isSaving: PropTypes.bool,
    lastSaveTime: PropTypes.string,
    saveError: PropTypes.string
};

AutoSaveIndicator.defaultProps = {
    isSaving: false,
    lastSaveTime: null,
    saveError: null
};

export default injectIntl(AutoSaveIndicator);
