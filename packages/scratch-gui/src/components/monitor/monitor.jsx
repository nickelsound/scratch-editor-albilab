import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import {FormattedMessage} from 'react-intl';
import {ContextMenu, ContextMenuItem, ContextMenuContent, ContextMenuTrigger, ContextMenuPortal} from '@radix-ui/react-context-menu';
import Box from '../box/box.jsx';
import DefaultMonitor from './default-monitor.jsx';
import LargeMonitor from './large-monitor.jsx';
import SliderMonitor from '../../containers/slider-monitor.jsx';
import ListMonitor from '../../containers/list-monitor.jsx';
import {getColorsForTheme} from '../../lib/themes/index.js';

import styles from './monitor.css';

// Map category name to color name used in scratch-blocks Blockly.Colours
const categoryColorMap = {
    data: 'data',
    sensing: 'sensing',
    sound: 'sounds',
    looks: 'looks',
    motion: 'motion',
    list: 'data_lists',
    extension: 'pen'
};

const modes = {
    default: DefaultMonitor,
    large: LargeMonitor,
    slider: SliderMonitor,
    list: ListMonitor
};

const getCategoryColor = (theme, category) => {
    const colors = getColorsForTheme(theme);
    return {
        background: colors[categoryColorMap[category]].primary,
        text: colors.text
    };
};

const MonitorComponent = props => (
    <ContextMenu>
        <ContextMenuTrigger asChild>
            <Draggable
                bounds=".monitor-overlay" // Class for monitor container
                cancel=".no-drag" // Class used for slider input to prevent drag
                defaultClassNameDragging={styles.dragging}
                disabled={!props.draggable}
                onStop={props.onDragEnd}
            >
                <Box
                    className={styles.monitorContainer}
                    componentRef={props.componentRef}
                    onDoubleClick={props.mode === 'list' || !props.draggable ? null : props.onNextMode}
                >
                    {React.createElement(modes[props.mode], {
                        categoryColor: getCategoryColor(props.theme, props.category),
                        ...props
                    })}
                </Box>
            </Draggable>
        </ContextMenuTrigger>
        {ReactDOM.createPortal((
            <ContextMenuPortal>
                <ContextMenuContent
                    align="start"
                    sideOffset={5}
                    className={styles.contextMenu}
                >
                    {props.onSetModeToDefault && (
                        <ContextMenuItem onClick={props.onSetModeToDefault}>
                            <FormattedMessage
                                defaultMessage="normal readout"
                                description="Menu item to switch to the default monitor"
                                id="gui.monitor.contextMenu.default"
                            />
                        </ContextMenuItem>
                    )}
                    {props.onSetModeToLarge && (
                        <ContextMenuItem onClick={props.onSetModeToLarge}>
                            <FormattedMessage
                                defaultMessage="large readout"
                                description="Menu item to switch to the large monitor"
                                id="gui.monitor.contextMenu.large"
                            />
                        </ContextMenuItem>
                    )}
                    {props.onSetModeToSlider && (
                        <ContextMenuItem onClick={props.onSetModeToSlider}>
                            <FormattedMessage
                                defaultMessage="slider"
                                description="Menu item to switch to the slider monitor"
                                id="gui.monitor.contextMenu.slider"
                            />
                        </ContextMenuItem>
                    )}
                    {props.onSliderPromptOpen && props.mode === 'slider' && (
                        <ContextMenuItem onClick={props.onSliderPromptOpen}>
                            <FormattedMessage
                                defaultMessage="change slider range"
                                description="Menu item to change the slider range"
                                id="gui.monitor.contextMenu.sliderRange"
                            />
                        </ContextMenuItem>
                    )}
                    {props.onImport && (
                        <ContextMenuItem onClick={props.onImport}>
                            <FormattedMessage
                                defaultMessage="import"
                                description="Menu item to import into list monitors"
                                id="gui.monitor.contextMenu.import"
                            />
                        </ContextMenuItem>
                    )}
                    {props.onExport && (
                        <ContextMenuItem onClick={props.onExport}>
                            <FormattedMessage
                                defaultMessage="export"
                                description="Menu item to export from list monitors"
                                id="gui.monitor.contextMenu.export"
                            />
                        </ContextMenuItem>
                    )}
                    {props.onHide && (
                        <ContextMenuItem onClick={props.onHide}>
                            <FormattedMessage
                                defaultMessage="hide"
                                description="Menu item to hide the monitor"
                                id="gui.monitor.contextMenu.hide"
                            />
                        </ContextMenuItem>
                    )}
                </ContextMenuContent>
            </ContextMenuPortal>
        ), document.body)}
    </ContextMenu>
);

const monitorModes = Object.keys(modes);

MonitorComponent.propTypes = {
    category: PropTypes.oneOf(Object.keys(categoryColorMap)),
    componentRef: PropTypes.func.isRequired,
    draggable: PropTypes.bool.isRequired,
    label: PropTypes.string.isRequired,
    mode: PropTypes.oneOf(monitorModes),
    onDragEnd: PropTypes.func.isRequired,
    onExport: PropTypes.func,
    onImport: PropTypes.func,
    onHide: PropTypes.func,
    onNextMode: PropTypes.func.isRequired,
    onSetModeToDefault: PropTypes.func,
    onSetModeToLarge: PropTypes.func,
    onSetModeToSlider: PropTypes.func,
    onSliderPromptOpen: PropTypes.func,
    theme: PropTypes.string.isRequired
};

MonitorComponent.defaultProps = {
    category: 'extension',
    mode: 'default'
};

export {
    MonitorComponent as default,
    monitorModes
};
