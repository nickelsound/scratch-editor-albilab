import React from 'react';
import {ContextMenuItem} from '@radix-ui/react-context-menu';
import classNames from 'classnames';
import styles from './context-menu.css';

const StyledMenuItem = ({ children, ...props }) => (
    <ContextMenuItem {...props}>
        {children}
    </ContextMenuItem>
);

const BorderedMenuItem = ({ children, ...props }) => (
    <ContextMenuItem className={classNames(styles.menuItem, styles.menuItemBordered)} {...props}>
        {children}
    </ContextMenuItem>
);

const DangerousMenuItem = ({ children, ...props }) => (
    <ContextMenuItem className={classNames(styles.menuItem, styles.menuItemBordered, styles.menuItemDanger)} {...props}>
        {children}
    </ContextMenuItem>
);

export {
    BorderedMenuItem,
    DangerousMenuItem,
    StyledMenuItem as MenuItem
};