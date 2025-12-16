import React from 'react';
import PropTypes from 'prop-types';
import DragConstants from '../../lib/drag-constants';
import styles from './drag-layer.css';

/* eslint no-confusing-arrow: ["error", {"allowParens": true}] */
const DragLayer = ({dragging, img, currentOffset, dragType}) => {
    if (!dragging) return null;
    
    // For PROJECT drag type, use larger image size and higher z-index
    const isProject = dragType === DragConstants.PROJECT;
    const imageClassName = isProject ? styles.imageLarge : styles.image;
    
    // Use data attribute and inline style for z-index to override !important on project manager
    const dragLayerStyle = isProject 
        ? { zIndex: 100001 } // Higher than project manager (100000)
        : undefined;
    const dragLayerProps = isProject 
        ? { 'data-over-modal': 'true', style: dragLayerStyle }
        : {};
    
    return (
        <div className={styles.dragLayer} {...dragLayerProps}>
            <div
                className={styles.imageWrapper}
                style={{
                    transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`
                }}
            >
                <img
                    className={imageClassName}
                    src={img}
                />
            </div>
        </div>
    );
};

DragLayer.propTypes = {
    currentOffset: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired
    }),
    dragging: PropTypes.bool.isRequired,
    img: PropTypes.string,
    dragType: PropTypes.string
};

export default DragLayer;
