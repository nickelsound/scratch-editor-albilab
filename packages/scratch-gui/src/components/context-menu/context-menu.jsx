import React from 'react';
import PropTypes from 'prop-types';
import {ContextMenuItem} from '@radix-ui/react-context-menu';
import classNames from 'classnames';
import styles from './context-menu.css';

const StyledMenuItem = ({children, ...props}) => (
    <ContextMenuItem
        className={styles.menuItem}
        {...props}
    >
        {children}
    </ContextMenuItem>
);

StyledMenuItem.propTypes = {
    children: PropTypes.node
};

const BorderedMenuItem = ({children, ...props}) => (
    <ContextMenuItem
        className={classNames(styles.menuItem, styles.menuItemBordered)}
        {...props}
    >
        {children}
    </ContextMenuItem>
);

BorderedMenuItem.propTypes = {
    children: PropTypes.node
};

const DangerousMenuItem = ({children, ...props}) => (
    <ContextMenuItem
        className={classNames(styles.menuItem, styles.menuItemBordered, styles.menuItemDanger)}
        {...props}
    >
        {children}
    </ContextMenuItem>
);

DangerousMenuItem.propTypes = {
    children: PropTypes.node
};

export {
    BorderedMenuItem,
    DangerousMenuItem,
    StyledMenuItem as MenuItem
};
