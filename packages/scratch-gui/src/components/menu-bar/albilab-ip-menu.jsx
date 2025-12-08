import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage, defineMessages, injectIntl} from 'react-intl';
import {connect} from 'react-redux';

import {MenuItem} from '../menu/menu.jsx';
import {openAlbilabIPPrompt} from '../../reducers/modals';

import styles from './settings-menu.css';
import albilabIPIcon from './icon--albilab-ip.svg';

const messages = defineMessages({
    title: {
        defaultMessage: 'AlbiLAB IP Address',
        description: 'Title for AlbiLAB IP address menu item',
        id: 'gui.albilabIPMenu.title'
    }
});

const AlbilabIPMenu = ({
    intl,
    onRequestCloseSettings,
    onOpenIPPrompt
}) => {
    const handleClick = () => {
        onOpenIPPrompt();
        onRequestCloseSettings();
    };

    return (
        <MenuItem onClick={handleClick}>
            <div className={styles.option}>
                <img
                    className={styles.icon}
                    src={albilabIPIcon}
                />
                <span className={styles.submenuLabel}>
                    <FormattedMessage {...messages.title} />
                </span>
            </div>
        </MenuItem>
    );
};

AlbilabIPMenu.propTypes = {
    intl: PropTypes.object.isRequired,
    onRequestCloseSettings: PropTypes.func.isRequired,
    onOpenIPPrompt: PropTypes.func.isRequired
};

const mapDispatchToProps = dispatch => ({
    onOpenIPPrompt: () => dispatch(openAlbilabIPPrompt())
});

export default injectIntl(connect(
    null,
    mapDispatchToProps
)(AlbilabIPMenu));

