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
        status,
        lastSaveTime,
        isSaving,
        ...componentProps
    } = props;

    const getStatusMessage = () => {
        switch (status) {
            case 'saving':
                return intl.formatMessage(messages.saving);
            case 'saved':
                return intl.formatMessage(messages.saved);
            case 'error':
                return intl.formatMessage(messages.error);
            default:
                return '';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'saving':
                return '⏳';
            case 'saved':
                return '✅';
            case 'error':
                return '❌';
            default:
                return '';
        }
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
                    [styles.autoSaveIndicatorSaved]: status === 'saved',
                    [styles.autoSaveIndicatorError]: status === 'error'
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
        </div>
    );
};

AutoSaveIndicator.propTypes = {
    className: PropTypes.string,
    intl: intlShape.isRequired,
    status: PropTypes.oneOf(['saving', 'saved', 'error', 'idle']),
    lastSaveTime: PropTypes.instanceOf(Date),
    isSaving: PropTypes.bool
};

AutoSaveIndicator.defaultProps = {
    status: 'idle',
    isSaving: false
};

export default injectIntl(AutoSaveIndicator);
