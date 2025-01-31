import React from 'react';
// import * as ContextMenu from '@radix-ui/react-context-menu';
import classNames from 'classnames';
import styles from './context-menu.css';

const StyledContextMenu = ({ children, ...props }) => (
    <p></p>
    // <ContextMenu.Root>
    //     <ContextMenu.Trigger asChild {...props}>
    //         {children}
    //     </ContextMenu.Trigger>
    //     <ContextMenu.Portal>
    //         <ContextMenu.Content className={styles.contextMenu}>
    //             {props.items}
    //         </ContextMenu.Content>
    //     </ContextMenu.Portal>
    // </ContextMenu.Root>
);

const StyledMenuItem = ({ children, ...props }) => (
    <p></p>
    // <ContextMenu.Item className={styles.menuItem} {...props}>
    //     {children}
    // </ContextMenu.Item>
);

const BorderedMenuItem = ({ children, ...props }) => (
    <p></p>
    // <ContextMenu.Item className={classNames(styles.menuItem, styles.menuItemBordered)} {...props}>
    //     {children}
    // </ContextMenu.Item>
);

const DangerousMenuItem = ({ children, ...props }) => (
    <p></p>
    // <ContextMenu.Item className={classNames(styles.menuItem, styles.menuItemBordered, styles.menuItemDanger)} {...props}>
    //     {children}
    // </ContextMenu.Item>
);

export {
    BorderedMenuItem,
    DangerousMenuItem,
    StyledContextMenu as ContextMenu,
    StyledMenuItem as MenuItem
};