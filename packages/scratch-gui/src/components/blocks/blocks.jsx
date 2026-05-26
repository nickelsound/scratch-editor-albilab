import PropTypes from 'prop-types';
import classNames from 'classnames';
import React from 'react';
import Box from '../box/box.jsx';
import styles from './blocks.css';

const BlocksComponent = props => {
    const {
        containerRef,
        dragOver,
        flyoutWidth,
        isFlyoutResizing,
        onFlyoutResizeKeyDown,
        onFlyoutResizeStart,
        style,
        ...componentProps
    } = props;
    const nextStyle = Object.assign({}, style, {
        '--scratch-flyout-width': `${flyoutWidth}px`
    });
    return (
        <Box
            className={classNames(styles.blocks, {
                [styles.dragOver]: dragOver
            })}
            style={nextStyle}
            {...componentProps}
        >
            <div
                className={styles.blocksInjection}
                ref={containerRef}
            />
            <div
                aria-label="Resize blocks palette"
                aria-orientation="vertical"
                className={classNames(styles.flyoutResizeHandle, {
                    [styles.flyoutResizeHandleActive]: isFlyoutResizing
                })}
                role="separator"
                tabIndex="0"
                title="Resize blocks palette"
                onKeyDown={onFlyoutResizeKeyDown}
                onMouseDown={onFlyoutResizeStart}
                onTouchStart={onFlyoutResizeStart}
            />
        </Box>
    );
};
BlocksComponent.propTypes = {
    containerRef: PropTypes.func,
    dragOver: PropTypes.bool,
    flyoutWidth: PropTypes.number,
    isFlyoutResizing: PropTypes.bool,
    onFlyoutResizeKeyDown: PropTypes.func,
    onFlyoutResizeStart: PropTypes.func,
    style: PropTypes.object
};
BlocksComponent.defaultProps = {
    flyoutWidth: 250,
    style: {}
};
export default BlocksComponent;
