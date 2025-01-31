import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import DeleteButton from '../delete-button/delete-button.jsx';
import styles from './sprite-selector-item.css';
import { DangerousMenuItem, ContextMenu, MenuItem } from '../context-menu/context-menu.jsx';
import { FormattedMessage } from 'react-intl';
//import * as RadixContextMenu from '@radix-ui/react-context-menu';

const SpriteSelectorItem = props => (
    <p>HI</p>
    // <RadixContextMenu.Root>
    //     <RadixContextMenu.Trigger asChild>
    //         <div
    //             className={classNames(props.className, styles.spriteSelectorItem, {
    //                 [styles.isSelected]: props.selected
    //             })}
    //             onClick={props.onClick}
    //             onMouseEnter={props.onMouseEnter}
    //             onMouseLeave={props.onMouseLeave}
    //             onMouseDown={props.onMouseDown}
    //             onTouchStart={props.onMouseDown}
    //             ref={props.componentRef}
    //         >
    //             {typeof props.number === 'undefined' ? null : (
    //                 <div className={styles.number}>{props.number}</div>
    //             )}
    //             {props.costumeURL ? (
    //                 <div className={styles.spriteImageOuter}>
    //                     <div className={styles.spriteImageInner}>
    //                         <img
    //                             className={styles.spriteImage}
    //                             draggable={false}
    //                             src={props.costumeURL}
    //                         />
    //                     </div>
    //                 </div>
    //             ) : null}
    //             <div className={styles.spriteInfo}>
    //                 <div className={styles.spriteName}>{props.name}</div>
    //                 {props.details ? (
    //                     <div className={styles.spriteDetails}>{props.details}</div>
    //                 ) : null}
    //             </div>
    //             {(props.selected && props.onDeleteButtonClick) ? (
    //                 <DeleteButton
    //                     className={styles.deleteButton}
    //                     onClick={props.onDeleteButtonClick}
    //                 />
    //             ) : null}
    //         </div>
    //     </RadixContextMenu.Trigger>
    //     {(props.onDuplicateButtonClick || props.onDeleteButtonClick || props.onExportButtonClick) && (
    //         <RadixContextMenu.Portal>
    //             <RadixContextMenu.Content className={styles.contextMenu}>
    //                 {props.onDuplicateButtonClick && (
    //                     <MenuItem onClick={props.onDuplicateButtonClick}>
    //                         <FormattedMessage
    //                             defaultMessage="duplicate"
    //                             description="Menu item to duplicate in the right click menu"
    //                             id="gui.spriteSelectorItem.contextMenuDuplicate"
    //                         />
    //                     </MenuItem>
    //                 )}
    //                 {props.onExportButtonClick && (
    //                     <MenuItem onClick={props.onExportButtonClick}>
    //                         <FormattedMessage
    //                             defaultMessage="export"
    //                             description="Menu item to export the selected item"
    //                             id="gui.spriteSelectorItem.contextMenuExport"
    //                         />
    //                     </MenuItem>
    //                 )}
    //                 {props.onDeleteButtonClick && (
    //                     <DangerousMenuItem onClick={props.onDeleteButtonClick}>
    //                         <FormattedMessage
    //                             defaultMessage="delete"
    //                             description="Menu item to delete in the right click menu"
    //                             id="gui.spriteSelectorItem.contextMenuDelete"
    //                         />
    //                     </DangerousMenuItem>
    //                 )}
    //             </RadixContextMenu.Content>
    //         </RadixContextMenu.Portal>
    //     )}
    // </RadixContextMenu.Root>
);

SpriteSelectorItem.propTypes = {
    className: PropTypes.string,
    componentRef: PropTypes.func,
    costumeURL: PropTypes.string,
    details: PropTypes.string,
    name: PropTypes.string.isRequired,
    number: PropTypes.number,
    onClick: PropTypes.func,
    onDeleteButtonClick: PropTypes.func,
    onDuplicateButtonClick: PropTypes.func,
    onExportButtonClick: PropTypes.func,
    onMouseDown: PropTypes.func,
    onMouseEnter: PropTypes.func,
    onMouseLeave: PropTypes.func,
    preventContextMenu: PropTypes.bool,
    selected: PropTypes.bool.isRequired
};

export default SpriteSelectorItem;
