import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

import Button from '../button/button.jsx';

import serviceIcon from './service-icon.svg';
import styles from './menu-bar.css';

const messages = defineMessages({
    serviceTitle: {
        id: 'gui.menuBar.service',
        defaultMessage: 'Nahrát do AlbiLAB',
        description: 'Service button title'
    },
    serviceTooltip: {
        id: 'gui.menuBar.serviceTooltip',
        defaultMessage: 'Spustit projekt jako trvalou službu na Raspberry Pi',
        description: 'Service button tooltip'
    }
});

const ServiceButton = function (props) {
    const {
        className,
        intl,
        isRunning,
        onClick,
        ...componentProps
    } = props;

    return (
        <Button
            className={classNames(
                className,
                styles.menuBarButton,
                styles.serviceButton,
                {
                    [styles.serviceButtonRunning]: isRunning
                }
            )}
            iconClassName={styles.serviceButtonIcon}
            iconSrc={serviceIcon}
            onClick={onClick}
            title={intl.formatMessage(messages.serviceTooltip)}
            {...componentProps}
        >
            <FormattedMessage {...messages.serviceTitle} />
        </Button>
    );
};

ServiceButton.propTypes = {
    className: PropTypes.string,
    intl: intlShape.isRequired,
    isRunning: PropTypes.bool,
    onClick: PropTypes.func.isRequired
};

ServiceButton.defaultProps = {
    isRunning: false
};

export default injectIntl(ServiceButton);
