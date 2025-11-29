import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

import styles from './menu-bar.css';

const messages = defineMessages({
    saving: {
        id: 'gui.menuBar.autoSave.saving',
        defaultMessage: 'Saving...',
        description: 'Auto-save indicator when saving'
    },
    saved: {
        id: 'gui.menuBar.autoSave.saved',
        defaultMessage: 'Saved',
        description: 'Auto-save indicator when saved'
    },
    error: {
        id: 'gui.menuBar.autoSave.error',
        defaultMessage: 'Save error',
        description: 'Auto-save indicator when error'
    },
    lastSaved: {
        id: 'gui.menuBar.autoSave.lastSaved',
        defaultMessage: 'Last saved: {time}',
        description: 'Auto-save indicator with last save time'
    },
    unsaved: {
        id: 'gui.menuBar.autoSave.unsaved',
        defaultMessage: 'Unsaved project',
        description: 'Auto-save indicator when project is not saved'
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
            return intl.formatMessage(messages.unsaved);
        }
    };

    const handleForceSave = () => {
        // Vyvolej event pro vynucení uložení
        window.dispatchEvent(new CustomEvent('forceAutoSave'));
    };

    const getStatusIcon = () => {
        if (isSaving) {
            return '⏳';
        } else if (saveError) {
            return '❌';
        } else if (lastSaveTime) {
            return '✅';
        } else {
            return '💾';
        }
    };

    const formatLastSaveTime = (time) => {
        if (!time) return '';
        
        const saveTime = new Date(time);
        const locale = intl.locale || 'en';
        return saveTime.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div
            className={classNames(
                className,
                styles.autoSaveIndicator,
                {
                    [styles.autoSaveIndicatorSaving]: isSaving,
                    [styles.autoSaveIndicatorSaved]: lastSaveTime && !isSaving && !saveError,
                    [styles.autoSaveIndicatorError]: saveError,
                    [styles.autoSaveIndicatorUnsaved]: !lastSaveTime && !isSaving && !saveError
                }
            )}
            title={lastSaveTime ? intl.formatMessage(messages.lastSaved, {
                time: formatLastSaveTime(lastSaveTime)
            }) : intl.formatMessage(messages.unsaved)}
            {...componentProps}
        >
            <span className={styles.autoSaveIcon}>
                {getStatusIcon()}
            </span>
            {!isSaving && !saveError ? (
                <button
                    className={styles.autoSaveTimeButton}
                    onClick={handleForceSave}
                    title={intl.formatMessage({
                        id: 'gui.menuBar.autoSave.forceSave',
                        defaultMessage: 'Click for immediate save'
                    })}
                >
                    {getStatusMessage()}
                </button>
            ) : (
                <span className={styles.autoSaveText}>
                    {getStatusMessage()}
                </span>
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
