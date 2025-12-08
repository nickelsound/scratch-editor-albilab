import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

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
        defaultMessage: 'Load this project into the editor so you can edit it',
        description: 'Tooltip for load project button'
    },
    tooltipDeployProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.deployProject',
        defaultMessage: 'Deploy the project for the first time. The project will be saved and ready to run',
        description: 'Tooltip for deploy project button'
    },
    tooltipRedeployProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.redeployProject',
        defaultMessage: 'Redeploy the project with your current changes. Replaces the old deployed version with the new one',
        description: 'Tooltip for redeploy project button'
    },
    tooltipRestoreFromDeploy: {
        id: 'gui.menuBar.autoSaveManager.tooltip.restoreFromDeploy',
        defaultMessage: 'Restore your working version from the deployed version. Use this if you made a mistake while editing',
        description: 'Tooltip for restore from deploy button'
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
    tooltipDeployCurrentProject: {
        id: 'gui.menuBar.autoSaveManager.tooltip.deployCurrentProject',
        defaultMessage: 'Deploy the project you currently have open in the editor',
        description: 'Tooltip for deploy current project button'
    }
});

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

    const handleDeleteProject = (project) => {
        const confirmed = window.confirm(
            intl.formatMessage(messages.confirmDelete, { name: project.projectName })
        );
        if (confirmed) {
            onDeleteProject(project.projectName);
        }
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
                    ) : projects.length === 0 ? (
                        <div className={styles.autoSaveManagerEmpty}>
                            {intl.formatMessage(messages.noProjects)}
                        </div>
                    ) : (
                        <div className={styles.autoSaveManagerList}>
                            {projects.map((project, index) => {
                                const isCurrentProject = currentProjectTitle && 
                                    currentProjectTitle === project.projectName;
                                return (
                                <div 
                                    key={index} 
                                    className={classNames(
                                        styles.autoSaveManagerItem,
                                        isCurrentProject && styles.autoSaveManagerItemCurrent
                                    )}
                                >
                                    <div className={styles.autoSaveManagerItemInfo}>
                                        <div className={styles.autoSaveManagerItemName}>
                                            {project.projectName}
                                        </div>
                                        <div className={styles.autoSaveManagerItemTime}>
                                            {intl.formatMessage(messages.lastSaved, {
                                                time: formatLastSaveTime(project.savedAt)
                                            })}
                                        </div>
                                        {project.deployedAt && (
                                            <div className={styles.autoSaveManagerItemTime}>
                                                {intl.formatMessage(messages.deployedAt, {
                                                    time: formatLastSaveTime(project.deployedAt)
                                                })}
                                            </div>
                                        )}
                                        <div className={classNames(styles.autoSaveManagerItemStatus, getStatusClass(project))}>
                                            {getProjectStatus(project)}
                                        </div>
                                    </div>
                                    <div className={styles.autoSaveManagerItemActions}>
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
                                                    {intl.formatMessage(messages.deployProject)}
                                                </button>
                                            )}
                                        </div>
                                        {project.isDeployed && (
                                            <div className={styles.autoSaveManagerButtonGroup}>
                                                <button
                                                    className={styles.autoSaveManagerButton}
                                                    onClick={() => onDeployProject(project.projectName)}
                                                    title={intl.formatMessage(messages.tooltipRedeployProject)}
                                                >
                                                    {intl.formatMessage(messages.redeployProject)}
                                                </button>
                                                <button
                                                    className={styles.autoSaveManagerButton}
                                                    onClick={() => onRestoreFromDeploy(project.projectName)}
                                                    title={intl.formatMessage(messages.tooltipRestoreFromDeploy)}
                                                >
                                                    {intl.formatMessage(messages.restoreFromDeploy)}
                                                </button>
                                            </div>
                                        )}
                                        {project.isDeployed && (
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
                                        )}
                                        <button
                                            className={classNames(
                                                styles.autoSaveManagerButton,
                                                styles.autoSaveManagerButtonDanger
                                            )}
                                            onClick={() => handleDeleteProject(project)}
                                            title={intl.formatMessage(messages.tooltipDeleteProject)}
                                        >
                                            {intl.formatMessage(messages.deleteProject)}
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
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

AutoSaveManager.propTypes = {
    className: PropTypes.string,
    intl: intlShape.isRequired,
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
    onClose: PropTypes.func,
    onLoadProject: PropTypes.func,
    onDeployProject: PropTypes.func,
    onDeployCurrentProject: PropTypes.func,
    onStartProject: PropTypes.func,
    onStopProject: PropTypes.func,
    onRestoreFromDeploy: PropTypes.func,
    onDeleteProject: PropTypes.func
};

AutoSaveManager.defaultProps = {
    isOpen: false,
    projects: [],
    isLoading: false,
    onClose: () => {},
    onLoadProject: () => {},
    onDeployProject: () => {},
    onDeployCurrentProject: () => {},
    onStartProject: () => {},
    onStopProject: () => {},
    onRestoreFromDeploy: () => {},
    onDeleteProject: () => {}
};

export default injectIntl(AutoSaveManager);
