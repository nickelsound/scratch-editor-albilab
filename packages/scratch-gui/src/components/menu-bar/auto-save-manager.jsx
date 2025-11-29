import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

import styles from './menu-bar.css';

const messages = defineMessages({
    title: {
        id: 'gui.menuBar.autoSaveManager.title',
        defaultMessage: 'Auto-saved projects management',
        description: 'Title for auto-save manager dialog'
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
    deployCurrentProject: {
        id: 'gui.menuBar.autoSaveManager.deployCurrentProject',
        defaultMessage: 'Deploy current project',
        description: 'Deploy current project button'
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
    }
});

const AutoSaveManager = function (props) {
    const {
        className,
        intl,
        isOpen,
        projects,
        isLoading,
        onClose,
        onLoadProject,
        onDeployProject,
        onDeployCurrentProject,
        onStartProject,
        onStopProject,
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
                            {projects.map((project, index) => (
                                <div key={index} className={styles.autoSaveManagerItem}>
                                    <div className={styles.autoSaveManagerItemInfo}>
                                        <div className={styles.autoSaveManagerItemName}>
                                            {project.projectName}
                                        </div>
                                        <div className={styles.autoSaveManagerItemTime}>
                                            {intl.formatMessage(messages.lastSaved, {
                                                time: formatLastSaveTime(project.savedAt)
                                            })}
                                        </div>
                                        <div className={classNames(styles.autoSaveManagerItemStatus, getStatusClass(project))}>
                                            {getProjectStatus(project)}
                                        </div>
                                    </div>
                                    <div className={styles.autoSaveManagerItemActions}>
                                        <button
                                            className={styles.autoSaveManagerButton}
                                            onClick={() => onLoadProject(project.projectName)}
                                        >
                                            {intl.formatMessage(messages.loadProject)}
                                        </button>
                                        {!project.isDeployed && (
                                            <button
                                                className={styles.autoSaveManagerButton}
                                                onClick={() => onDeployProject(project.projectName)}
                                            >
                                                {intl.formatMessage(messages.deployProject)}
                                            </button>
                                        )}
                                        {project.isDeployed && !project.isRunning && (
                                            <button
                                                className={styles.autoSaveManagerButton}
                                                onClick={() => onStartProject(project.projectName)}
                                            >
                                                {intl.formatMessage(messages.startProject)}
                                            </button>
                                        )}
                                        {project.isRunning && (
                                            <button
                                                className={styles.autoSaveManagerButton}
                                                onClick={() => onStopProject(project.projectName)}
                                            >
                                                {intl.formatMessage(messages.stopProject)}
                                            </button>
                                        )}
                                        <button
                                            className={classNames(
                                                styles.autoSaveManagerButton,
                                                styles.autoSaveManagerButtonDanger
                                            )}
                                            onClick={() => handleDeleteProject(project)}
                                        >
                                            {intl.formatMessage(messages.deleteProject)}
                                        </button>
                                    </div>
                                </div>
                            ))}
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
    onClose: PropTypes.func,
    onLoadProject: PropTypes.func,
    onDeployProject: PropTypes.func,
    onDeployCurrentProject: PropTypes.func,
    onStartProject: PropTypes.func,
    onStopProject: PropTypes.func,
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
    onDeleteProject: () => {}
};

export default injectIntl(AutoSaveManager);
