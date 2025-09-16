import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

import Button from '../button/button.jsx';

import loadProjectIcon from './load-project-icon.svg';
import styles from './menu-bar.css';

const messages = defineMessages({
    loadProjectTitle: {
        id: 'gui.menuBar.loadProject',
        defaultMessage: 'Načíst projekt',
        description: 'Load project button title'
    },
    loadProjectTooltip: {
        id: 'gui.menuBar.loadProjectTooltip',
        defaultMessage: 'Načíst uložený projekt do editoru',
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
                styles.loadProjectButton,
                {
                    [styles.loadProjectButtonLoading]: isLoading
                }
            )}
            iconClassName={styles.loadProjectButtonIcon}
            iconSrc={loadProjectIcon}
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
