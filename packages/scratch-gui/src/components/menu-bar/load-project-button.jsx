import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

import Button from '../button/button.jsx';

import serviceIcon from './service-icon.svg';
import styles from './menu-bar.css';

const messages = defineMessages({
    loadProjectTitle: {
        id: 'gui.menuBar.loadProject',
        defaultMessage: 'Načíst z AlbiLAB',
        description: 'Load project button title'
    },
    loadProjectTooltip: {
        id: 'gui.menuBar.loadProjectTooltip',
        defaultMessage: 'Načíst uložený projekt z AlbiLAB do editoru',
        description: 'Load project button tooltip'
    }
});

const LoadProjectButton = function (props) {
    const {
        className,
        intl,
        isLoading,
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
                    [styles.serviceButtonRunning]: isLoading
                }
            )}
            iconClassName={styles.serviceButtonIcon}
            iconSrc={serviceIcon}
            onClick={onClick}
            title={intl.formatMessage(messages.loadProjectTooltip)}
            {...componentProps}
        >
            <FormattedMessage {...messages.loadProjectTitle} />
        </Button>
    );
};

LoadProjectButton.propTypes = {
    className: PropTypes.string,
    intl: intlShape.isRequired,
    isLoading: PropTypes.bool,
    onClick: PropTypes.func.isRequired
};

LoadProjectButton.defaultProps = {
    isLoading: false
};

export default injectIntl(LoadProjectButton);
