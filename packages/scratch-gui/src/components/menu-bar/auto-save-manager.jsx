import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import DragRecognizer from '../../lib/drag-recognizer';
import {updateAssetDrag} from '../../reducers/asset-drag';
import DragConstants from '../../lib/drag-constants';
import DropAreaHOC from '../../lib/drop-area-hoc';

import styles from './menu-bar.css';

const messages = defineMessages({
    title: {
        id: 'gui.menuBar.autoSaveManager.title',
        defaultMessage: 'Projects manager',
        description: 'Title for projects manager dialog'
    },
    loading: {
        id: 'gui.menuBar.autoSaveManager.loading',
        defaultMessage: 'Loading projects...',
        description: 'Loading message'
    },
    noProjects: {
        id: 'gui.menuBar.autoSaveManager.noProjects',
        defaultMessage: 'No auto-saved projects',
        description: 'No projects message'
    },
    loadProject: {
        id: 'gui.menuBar.autoSaveManager.loadProject',
        defaultMessage: 'Load',
        description: 'Load project button'
    },
    deployProject: {
        id: 'gui.menuBar.autoSaveManager.deployProject',
        defaultMessage: 'Deploy',
        description: 'Deploy project button'
    },
    runPermanently: {
        id: 'gui.menuBar.autoSaveManager.runPermanently',
        defaultMessage: 'Run permanently',
        description: 'Run project permanently button'
    },
    redeployProject: {
        id: 'gui.menuBar.autoSaveManager.redeployProject',
        defaultMessage: 'Redeploy',
        description: 'Redeploy project button'
    },
    restoreFromDeploy: {
        id: 'gui.menuBar.autoSaveManager.restoreFromDeploy',
        defaultMessage: 'Restore from Deploy',
        description: 'Restore project from deployed version button'
    },
    loadToEditor: {
        id: 'gui.menuBar.autoSaveManager.loadToEditor',
        defaultMessage: 'Load to editor',
        description: 'Load project to editor button'
    },
    deployCurrentProject: {
        id: 'gui.menuBar.autoSaveManager.deployCurrentProject',
        defaultMessage: 'Deploy and Start current project',
        description: 'Deploy and start current project button'
    },
    startProject: {
        id: 'gui.menuBar.autoSaveManager.startProject',
        defaultMessage: 'Start',
        description: 'Start project button'
    },
    stopProject: {
        id: 'gui.menuBar.autoSaveManager.stopProject',
        defaultMessage: 'Stop',
        description: 'Stop project button'
    },
    deleteProject: {
        id: 'gui.menuBar.autoSaveManager.deleteProject',
        defaultMessage: 'Delete',
        description: 'Delete project button'
    },
    close: {
        id: 'gui.menuBar.autoSaveManager.close',
        defaultMessage: 'Close',
        description: 'Close button'
    },
    lastSaved: {
        id: 'gui.menuBar.autoSaveManager.lastSaved',
        defaultMessage: 'Last saved: {time}',
        description: 'Last saved time'
    },
    deployedAt: {
        id: 'gui.menuBar.autoSaveManager.deployedAt',
        defaultMessage: 'Deployed: {time}',
        description: 'Deployed time'
    },
    confirmDelete: {
        id: 'gui.menuBar.autoSaveManager.confirmDelete',
        defaultMessage: 'Do you really want to delete project "{name}"?',
        description: 'Delete confirmation'
    },
    statusRunning: {
        id: 'gui.menuBar.autoSaveManager.statusRunning',
        defaultMessage: 'Running',
        description: 'Running status'
    },
    statusStopped: {
        id: 'gui.menuBar.autoSaveManager.statusStopped',
        defaultMessage: 'Stopped',
        description: 'Stopped status'
    },
    statusNotDeployed: {
        id: 'gui.menuBar.autoSaveManager.statusNotDeployed',
        defaultMessage: 'Not deployed',
        description: 'Not deployed status'
    },
    tooltipLoadProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.loadProject',
        defaultMessage: 'Load the editing version of this project into the editor so you can edit it',
        description: 'Tooltip for load project button in draft section'
    },
    tooltipLoadDeployedProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.loadDeployedProject',
        defaultMessage: 'Load the deployed version of this project into the editor. This will overwrite your current work in the editor',
        description: 'Tooltip for load project button in deployed section'
    },
    tooltipDeployProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.deployProject',
        defaultMessage: 'Deploy and start this project permanently. The project will be saved, deployed, and started. It will run even when you close the browser',
        description: 'Tooltip for deploy project button (Run permanently)'
    },
    tooltipRedeployProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.redeployProject',
        defaultMessage: 'Redeploy and restart the project with your current editing changes. This will replace the currently running deployed version and restart it',
        description: 'Tooltip for redeploy project button'
    },
    tooltipRestoreFromDeploy: {
        id: 'gui.menuBar.autoSaveManager.tooltip.restoreFromDeploy',
        defaultMessage: 'Load the deployed version into the editor. This will overwrite your current editing work. You can export your current work first using File → Save to your computer',
        description: 'Tooltip for restore from deploy button (Load in deployed section)'
    },
    tooltipStartProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.startProject',
        defaultMessage: 'Start the deployed project. The project will begin running and be available to others',
        description: 'Tooltip for start project button'
    },
    tooltipStopProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.stopProject',
        defaultMessage: 'Stop the running project. The project will stop running but remain deployed',
        description: 'Tooltip for stop project button'
    },
    tooltipDeleteProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.deleteProject',
        defaultMessage: 'Delete the project forever. This action cannot be undone',
        description: 'Tooltip for delete project button'
    },
    tooltipDeleteDraftProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.deleteDraftProject',
        defaultMessage: 'Delete the editing version of this project. The deployed version (if it exists) will remain',
        description: 'Tooltip for delete project button in draft section'
    },
    tooltipDeleteDeployedProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.deleteDeployedProject',
        defaultMessage: 'Delete the deployed version of this project. The editing version will remain. If the project is running, it will be stopped first',
        description: 'Tooltip for delete project button in deployed section'
    },
    tooltipDeployCurrentProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.deployCurrentProject',
        defaultMessage: 'Deploy the project you currently have open in the editor',
        description: 'Tooltip for deploy current project button'
    },
    draftSectionTitle: {
        id: 'gui.menuBar.autoSaveManager.draftSectionTitle',
        defaultMessage: 'Projects for editing and testing',
        description: 'Title for draft projects section'
    },
    draftSectionDescription: {
        id: 'gui.menuBar.autoSaveManager.draftSectionDescription',
        defaultMessage: 'These projects are for editing and testing. They are not permanently running and do not control AlbiLAB.',
        description: 'Description for draft projects section'
    },
    deployedSectionTitle: {
        id: 'gui.menuBar.autoSaveManager.deployedSectionTitle',
        defaultMessage: 'Projects for permanent running',
        description: 'Title for deployed projects section'
    },
    deployedSectionDescription: {
        id: 'gui.menuBar.autoSaveManager.deployedSectionDescription',
        defaultMessage: 'These projects run permanently and control AlbiLAB. They work even when you close the browser, but the server must stay on!',
        description: 'Description for deployed projects section'
    },
    confirmLoadToEditor: {
        id: 'gui.menuBar.autoSaveManager.confirmLoadToEditor',
        defaultMessage: 'Loading this project will overwrite your current work in the editor. If you want to keep your current work, you can export it first using File → Save to your computer. Do you want to continue?',
        description: 'Confirmation message when loading project to editor'
    },
    noDraftProjects: {
        id: 'gui.menuBar.autoSaveManager.noDraftProjects',
        defaultMessage: 'No draft projects',
        description: 'No draft projects message'
    },
    noDeployedProjects: {
        id: 'gui.menuBar.autoSaveManager.noDeployedProjects',
        defaultMessage: 'No deployed projects',
        description: 'No deployed projects message'
    },
    tooltipDragProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.dragProject',
        defaultMessage: 'Drag to move project between sections',
        description: 'Tooltip for drag handle'
    }
});

// Draft section component wrapped with DropAreaHOC
const DraftSectionComponent = function (props) {
    const {
        containerRef,
        dragOver,
        intl,
        draftProjects,
        renderProjectItem,
        onDrop
    } = props;
    
    return (
        <div 
            ref={containerRef}
            className={classNames(
                styles.autoSaveManagerDraftSection,
                dragOver && styles.autoSaveManagerDropZoneActive
            )}
        >
            <div className={styles.autoSaveManagerSectionHeader}>
                <h4 className={styles.autoSaveManagerSectionTitle}>
                    {intl.formatMessage(messages.draftSectionTitle)}
                </h4>
                <p className={styles.autoSaveManagerSectionDescription}>
                    {intl.formatMessage(messages.draftSectionDescription)}
                </p>
            </div>
            {draftProjects.length === 0 ? (
                <div className={styles.autoSaveManagerEmpty}>
                    {intl.formatMessage(messages.noDraftProjects)}
                </div>
            ) : (
                <div className={styles.autoSaveManagerList}>
                    {draftProjects.map((project, index) => renderProjectItem(project, index, false))}
                </div>
            )}
        </div>
    );
};

DraftSectionComponent.propTypes = {
    containerRef: PropTypes.func,
    dragOver: PropTypes.bool,
    intl: PropTypes.object,
    draftProjects: PropTypes.array,
    renderProjectItem: PropTypes.func,
    onDrop: PropTypes.func
};

// Deployed section component wrapped with DropAreaHOC
const DeployedSectionComponent = function (props) {
    const {
        containerRef,
        dragOver,
        intl,
        deployedProjects,
        renderProjectItem,
        onDrop
    } = props;
    
    return (
        <div 
            ref={containerRef}
            className={classNames(
                styles.autoSaveManagerDeployedSection,
                dragOver && styles.autoSaveManagerDropZoneActive
            )}
        >
            <div className={styles.autoSaveManagerSectionHeader}>
                <h4 className={styles.autoSaveManagerSectionTitle}>
                    {intl.formatMessage(messages.deployedSectionTitle)}
                </h4>
                <p className={styles.autoSaveManagerSectionDescription}>
                    {intl.formatMessage(messages.deployedSectionDescription)}
                </p>
            </div>
            {deployedProjects.length === 0 ? (
                <div className={styles.autoSaveManagerEmpty}>
                    {intl.formatMessage(messages.noDeployedProjects)}
                </div>
            ) : (
                <div className={styles.autoSaveManagerList}>
                    {deployedProjects.map((project, index) => renderProjectItem(project, index, true))}
                </div>
            )}
        </div>
    );
};

DeployedSectionComponent.propTypes = {
    containerRef: PropTypes.func,
    dragOver: PropTypes.bool,
    intl: PropTypes.object,
    deployedProjects: PropTypes.array,
    renderProjectItem: PropTypes.func,
    onDrop: PropTypes.func
};

const AutoSaveManager = function (props) {
    const {
        className,
        intl,
        isOpen,
        projects,
        isLoading,
        currentProjectTitle,
        onClose,
        onLoadProject,
        onDeployProject,
        onDeployCurrentProject,
        onStartProject,
        onStopProject,
        onRestoreFromDeploy,
        onDeleteProject,
        dragInfo,
        onDrag,
        onDropDraft,
        onDropDeployed,
        ...componentProps
    } = props;

    const formatLastSaveTime = (time) => {
        if (!time) return '';
        
        const saveTime = new Date(time);
        const locale = intl.locale || 'en';
        return saveTime.toLocaleString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getProjectStatus = (project) => {
        if (project.isRunning) {
            return intl.formatMessage(messages.statusRunning);
        } else if (project.isDeployed) {
            return intl.formatMessage(messages.statusStopped);
        } else {
            return intl.formatMessage(messages.statusNotDeployed);
        }
    };

    const getStatusClass = (project) => {
        if (project.isRunning) {
            return styles.autoSaveManagerStatusRunning;
        } else if (project.isDeployed) {
            return styles.autoSaveManagerStatusStopped;
        } else {
            return styles.autoSaveManagerStatusNotDeployed;
        }
    };

    const handleDeleteProject = (project, isDeployedSection = false) => {
        const confirmed = window.confirm(
            intl.formatMessage(messages.confirmDelete, { name: project.projectName })
        );
        if (confirmed) {
            // In draft section, delete auto-save version; in deployed section, delete deployed version
            onDeleteProject(project.projectName, isDeployedSection);
        }
    };

    // Split projects: 
    // - Draft section: all projects (they all have auto-save version)
    // - Deployed section: only projects that are deployed (they have deployed version)
    const draftProjects = projects; // All projects have auto-save version
    const deployedProjects = projects.filter(p => p.isDeployed); // Only deployed projects

    const renderProjectItem = (project, index, isDeployedSection = false) => {
        const isCurrentProject = currentProjectTitle && 
            currentProjectTitle === project.projectName;
        const isDragging = dragInfo && dragInfo.dragging && 
            dragInfo.dragType === DragConstants.PROJECT && 
            dragInfo.payload && 
            dragInfo.payload.projectName === project.projectName;
        // Use appropriate drag recognizer based on section
        const dragRecognizer = isDeployedSection ? project.dragRecognizerDeployed : project.dragRecognizerDraft;
        
        // In deployed section, show deployed version info; in draft section, show auto-save version info
        const showDeployedInfo = isDeployedSection && project.isDeployed;
        
        return (
            <div 
                key={`${project.projectName}-${index}-${isDeployedSection ? 'deployed' : 'draft'}`} 
                className={classNames(
                    styles.autoSaveManagerItem,
                    isCurrentProject && styles.autoSaveManagerItemCurrent,
                    isDragging && styles.autoSaveManagerItemDragging
                )}
            >
                {/* Drag handle in top right corner */}
                {dragRecognizer && (
                    <div 
                        className={styles.autoSaveManagerDragHandle}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            dragRecognizer.start(e);
                        }}
                        onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            dragRecognizer.start(e);
                        }}
                        title={intl.formatMessage(messages.tooltipDragProject)}
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
                            <circle cx="6" cy="2" r="1.5" fill="currentColor"/>
                            <circle cx="10" cy="2" r="1.5" fill="currentColor"/>
                            <circle cx="2" cy="6" r="1.5" fill="currentColor"/>
                            <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
                            <circle cx="10" cy="6" r="1.5" fill="currentColor"/>
                            <circle cx="2" cy="10" r="1.5" fill="currentColor"/>
                            <circle cx="6" cy="10" r="1.5" fill="currentColor"/>
                            <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                        </svg>
                    </div>
                )}
                <div className={styles.autoSaveManagerItemInfo}>
                    <div className={styles.autoSaveManagerItemName}>
                        {project.projectName}
                    </div>
                    {!showDeployedInfo && (
                        <div className={styles.autoSaveManagerItemTime}>
                            {intl.formatMessage(messages.lastSaved, {
                                time: formatLastSaveTime(project.savedAt)
                            })}
                        </div>
                    )}
                    {showDeployedInfo && project.deployedAt && (
                        <div className={styles.autoSaveManagerItemTime}>
                            {intl.formatMessage(messages.deployedAt, {
                                time: formatLastSaveTime(project.deployedAt)
                            })}
                        </div>
                    )}
                    {showDeployedInfo && (
                        <div className={classNames(styles.autoSaveManagerItemStatus, getStatusClass(project))}>
                            {getProjectStatus(project)}
                        </div>
                    )}
                    {!showDeployedInfo && (
                        <div className={classNames(styles.autoSaveManagerItemStatus, styles.autoSaveManagerStatusNotDeployed)}>
                            {intl.formatMessage(messages.statusNotDeployed)}
                        </div>
                    )}
                </div>
                <div className={styles.autoSaveManagerItemActions}>
                    {!isDeployedSection && (
                        // Draft section buttons - for editing version
                        <>
                            <div className={styles.autoSaveManagerButtonGroup}>
                                <button
                                    className={styles.autoSaveManagerButton}
                                    onClick={() => onLoadProject(project.projectName)}
                                    title={intl.formatMessage(messages.tooltipLoadProject)}
                                >
                                    {intl.formatMessage(messages.loadProject)}
                                </button>
                                {!project.isDeployed && (
                                    <button
                                        className={styles.autoSaveManagerButton}
                                        onClick={() => onDeployProject(project.projectName)}
                                        title={intl.formatMessage(messages.tooltipDeployProject)}
                                    >
                                        {intl.formatMessage(messages.runPermanently)}
                                    </button>
                                )}
                                {project.isDeployed && (
                                    <button
                                        className={styles.autoSaveManagerButton}
                                        onClick={() => onDeployProject(project.projectName)}
                                        title={intl.formatMessage(messages.tooltipRedeployProject)}
                                    >
                                        {intl.formatMessage(messages.redeployProject)}
                                    </button>
                                )}
                            </div>
                            <button
                                className={classNames(
                                    styles.autoSaveManagerButton,
                                    styles.autoSaveManagerButtonDanger
                                )}
                                onClick={() => handleDeleteProject(project, false)}
                                title={intl.formatMessage(messages.tooltipDeleteDraftProject)}
                            >
                                {intl.formatMessage(messages.deleteProject)}
                            </button>
                        </>
                    )}
                    {isDeployedSection && (
                        // Deployed section buttons - for deployed version
                        <>
                            <div className={styles.autoSaveManagerButtonGroup}>
                                <button
                                    className={styles.autoSaveManagerButton}
                                    onClick={() => onRestoreFromDeploy(project.projectName)}
                                    title={intl.formatMessage(messages.tooltipLoadDeployedProject)}
                                >
                                    {intl.formatMessage(messages.loadProject)}
                                </button>
                            </div>
                            <div className={styles.autoSaveManagerButtonGroup}>
                                {!project.isRunning && (
                                    <button
                                        className={styles.autoSaveManagerButton}
                                        onClick={() => onStartProject(project.projectName)}
                                        title={intl.formatMessage(messages.tooltipStartProject)}
                                    >
                                        {intl.formatMessage(messages.startProject)}
                                    </button>
                                )}
                                {project.isRunning && (
                                    <button
                                        className={styles.autoSaveManagerButton}
                                        onClick={() => onStopProject(project.projectName)}
                                        title={intl.formatMessage(messages.tooltipStopProject)}
                                    >
                                        {intl.formatMessage(messages.stopProject)}
                                    </button>
                                )}
                            </div>
                            <button
                                className={classNames(
                                    styles.autoSaveManagerButton,
                                    styles.autoSaveManagerButtonDanger
                                )}
                                onClick={() => handleDeleteProject(project, true)}
                                title={intl.formatMessage(messages.tooltipDeleteDeployedProject)}
                            >
                                {intl.formatMessage(messages.deleteProject)}
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className={classNames(className, styles.autoSaveManagerOverlay)}>
            <div className={styles.autoSaveManagerDialog}>
                <div className={styles.autoSaveManagerHeader}>
                    <h3>{intl.formatMessage(messages.title)}</h3>
                    <div className={styles.autoSaveManagerHeaderActions}>
                        <button
                            className={styles.autoSaveManagerButton}
                            onClick={onDeployCurrentProject}
                            title={intl.formatMessage(messages.tooltipDeployCurrentProject)}
                        >
                            {intl.formatMessage(messages.deployCurrentProject)}
                        </button>
                        <button 
                            className={styles.autoSaveManagerClose}
                            onClick={onClose}
                        >
                            ×
                        </button>
                    </div>
                </div>
                
                <div className={styles.autoSaveManagerContent}>
                    {isLoading ? (
                        <div className={styles.autoSaveManagerLoading}>
                            {intl.formatMessage(messages.loading)}
                        </div>
                    ) : (
                        <>
                            {/* Draft Projects Section */}
                            <DraftDropArea
                                onDrop={onDropDraft}
                                intl={intl}
                                draftProjects={draftProjects}
                                renderProjectItem={renderProjectItem}
                            />

                            {/* Divider */}
                            <div className={styles.autoSaveManagerDivider}></div>

                            {/* Deployed Projects Section */}
                            <DeployedDropArea
                                onDrop={onDropDeployed}
                                intl={intl}
                                deployedProjects={deployedProjects}
                                renderProjectItem={renderProjectItem}
                            />
                        </>
                    )}
                </div>
                
                <div className={styles.autoSaveManagerFooter}>
                    <button 
                        className={styles.autoSaveManagerButton}
                        onClick={onClose}
                    >
                        {intl.formatMessage(messages.close)}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Create drop areas using DropAreaHOC
const DraftDropArea = DropAreaHOC([DragConstants.PROJECT])(DraftSectionComponent);
const DeployedDropArea = DropAreaHOC([DragConstants.PROJECT])(DeployedSectionComponent);

AutoSaveManager.propTypes = {
    className: PropTypes.string,
    intl: PropTypes.object.isRequired,
    isOpen: PropTypes.bool,
    projects: PropTypes.arrayOf(PropTypes.shape({
        projectName: PropTypes.string,
        savedAt: PropTypes.string,
        version: PropTypes.string,
        isDeployed: PropTypes.bool,
        isRunning: PropTypes.bool
    })),
    isLoading: PropTypes.bool,
    currentProjectTitle: PropTypes.string,
    dragInfo: PropTypes.shape({
        dragging: PropTypes.bool,
        currentOffset: PropTypes.shape({
            x: PropTypes.number,
            y: PropTypes.number
        }),
        dragType: PropTypes.string,
        index: PropTypes.number,
        payload: PropTypes.object
    }),
    onClose: PropTypes.func,
    onLoadProject: PropTypes.func,
    onDeployProject: PropTypes.func,
    onDeployCurrentProject: PropTypes.func,
    onStartProject: PropTypes.func,
    onStopProject: PropTypes.func,
    onRestoreFromDeploy: PropTypes.func,
    onDeleteProject: PropTypes.func,
    onDrag: PropTypes.func,
    onDropDraft: PropTypes.func,
    onDropDeployed: PropTypes.func
};


AutoSaveManager.defaultProps = {
    isOpen: false,
    projects: [],
    isLoading: false,
    dragInfo: {
        dragging: false,
        currentOffset: null,
        dragType: null,
        index: null,
        payload: null
    },
    onClose: () => {},
    onLoadProject: () => {},
    onDeployProject: () => {},
    onDeployCurrentProject: () => {},
    onStartProject: () => {},
    onStopProject: () => {},
    onRestoreFromDeploy: () => {},
    onDeleteProject: () => {},
    onDrag: () => {},
    onDropDraft: () => {},
    onDropDeployed: () => {}
};

const mapStateToProps = state => ({
    dragInfo: state.scratchGui.assetDrag
});

const mapDispatchToProps = dispatch => ({
    onDrag: (dragInfo) => dispatch(updateAssetDrag(dragInfo))
});

export default injectIntl(connect(mapStateToProps, mapDispatchToProps)(AutoSaveManager));
