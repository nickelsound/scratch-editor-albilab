import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';

import styles from './menu-bar.css';

const messages = defineMessages({
    title: {
        id: 'gui.menuBar.autoSaveManager.title',
        defaultMessage: 'Správa automaticky uložených projektů',
        description: 'Title for auto-save manager dialog'
    },
    loading: {
        id: 'gui.menuBar.autoSaveManager.loading',
        defaultMessage: 'Načítám projekty...',
        description: 'Loading message'
    },
    noProjects: {
        id: 'gui.menuBar.autoSaveManager.noProjects',
        defaultMessage: 'Žádné automaticky uložené projekty',
        description: 'No projects message'
    },
    loadProject: {
        id: 'gui.menuBar.autoSaveManager.loadProject',
        defaultMessage: 'Načíst',
        description: 'Load project button'
    },
    deleteProject: {
        id: 'gui.menuBar.autoSaveManager.deleteProject',
        defaultMessage: 'Smazat',
        description: 'Delete project button'
    },
    close: {
        id: 'gui.menuBar.autoSaveManager.close',
        defaultMessage: 'Zavřít',
        description: 'Close button'
    },
    lastSaved: {
        id: 'gui.menuBar.autoSaveManager.lastSaved',
        defaultMessage: 'Naposledy uloženo: {time}',
        description: 'Last saved time'
    },
    confirmDelete: {
        id: 'gui.menuBar.autoSaveManager.confirmDelete',
        defaultMessage: 'Opravdu chcete smazat projekt "{name}"?',
        description: 'Delete confirmation'
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
        onDeleteProject,
        ...componentProps
    } = props;

    const formatLastSaveTime = (time) => {
        if (!time) return '';
        
        const saveTime = new Date(time);
        return saveTime.toLocaleString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
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
                    <button 
                        className={styles.autoSaveManagerClose}
                        onClick={onClose}
                    >
                        ×
                    </button>
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
                                    </div>
                                    <div className={styles.autoSaveManagerItemActions}>
                                        <button
                                            className={styles.autoSaveManagerButton}
                                            onClick={() => onLoadProject(project.projectName)}
                                        >
                                            {intl.formatMessage(messages.loadProject)}
                                        </button>
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
        version: PropTypes.string
    })),
    isLoading: PropTypes.bool,
    onClose: PropTypes.func,
    onLoadProject: PropTypes.func,
    onDeleteProject: PropTypes.func
};

AutoSaveManager.defaultProps = {
    isOpen: false,
    projects: [],
    isLoading: false,
    onClose: () => {},
    onLoadProject: () => {},
    onDeleteProject: () => {}
};

export default injectIntl(AutoSaveManager);
