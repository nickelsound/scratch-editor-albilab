import classNames from 'classnames';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, intlShape, injectIntl} from 'react-intl';
import {setProjectTitle} from '../../reducers/project-title';
import {getApiUrl} from '../../lib/api-config.js';
import notificationService from '../../lib/notification-service.js';

import BufferedInputHOC from '../forms/buffered-input-hoc.jsx';
import Input from '../forms/input.jsx';
const BufferedInput = BufferedInputHOC(Input);

import styles from './project-title-input.css';

const messages = defineMessages({
    projectTitlePlaceholder: {
        id: 'gui.gui.projectTitlePlaceholder',
        description: 'Placeholder for project title when blank',
        defaultMessage: 'Project title here'
    },
    deployCurrentProject: {
        id: 'gui.gui.deployCurrentProject',
        description: 'Deploy current project button',
        defaultMessage: 'Nasadit aktuální projekt'
    }
});

const ProjectTitleInput = ({
    className,
    intl,
    onSubmit,
    projectTitle,
    vm
}) => {
    const handleManageClick = () => {
        // Vyvolej event pro otevření manageru
        window.dispatchEvent(new CustomEvent('openAutoSaveManager'));
    };

    const handleDeployClick = async () => {
        try {
            if (!vm) {
                notificationService.showWarning(intl.formatMessage({id: 'gui.errors.noProjectLoaded'}));
                return;
            }

            // Získej aktuální data projektu z VM
            const projectData = vm.toJSON();
            const projectName = projectTitle || intl.formatMessage({id: 'gui.gui.unknownProject'});

            // Nejdříve ulož projekt do auto-save
            const autoSaveUrl = getApiUrl('/saved-project/auto-save');
            const autoSaveResponse = await fetch(autoSaveUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectData: projectData,
                    projectName: projectName
                })
            });

            if (!autoSaveResponse.ok) {
                notificationService.showError(intl.formatMessage({id: 'gui.errors.savingProjectWithDetails'}, {details: autoSaveResponse.statusText}));
                return;
            }

            // Pak nasaď projekt
            const deployUrl = getApiUrl('deploy-project');
            const deployResponse = await fetch(deployUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ projectName })
            });
            
            if (deployResponse.ok) {
                const data = await deployResponse.json();
                if (data.success) {
                    notificationService.showSuccess(intl.formatMessage({id: 'gui.success.currentProjectDeployed'}, {name: projectName}));
                } else {
                    notificationService.showError(data.error || intl.formatMessage({id: 'gui.errors.unknownError'}), intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            } else {
                try {
                    const errorData = await deployResponse.json();
                    notificationService.showError(errorData.error || deployResponse.statusText, intl.formatMessage({id: 'gui.errors.deployingProject'}));
                } catch (parseError) {
                    notificationService.showError(deployResponse.statusText, intl.formatMessage({id: 'gui.errors.deployingProject'}));
                }
            }
        } catch (error) {
            console.error('Chyba při nasazování aktuálního projektu:', error);
            notificationService.showError(error.message, intl.formatMessage({id: 'gui.errors.deployingCurrentProject'}));
        }
    };

    return (
        <div className={styles.titleFieldContainer}>
            <BufferedInput
                className={classNames(styles.titleField, className)}
                maxLength="100"
                placeholder={intl.formatMessage(messages.projectTitlePlaceholder)}
                tabIndex="0"
                type="text"
                value={projectTitle}
                onSubmit={onSubmit}
            />
            <button
                className={styles.deployButton}
                onClick={handleDeployClick}
                title={intl.formatMessage(messages.deployCurrentProject)}
            >
                🚀
            </button>
            <button
                className={styles.manageButton}
                onClick={handleManageClick}
                title={intl.formatMessage({id: 'gui.menuBar.autoSaveManager.manageProjects'})}
            >
                📁
            </button>
        </div>
    );
};

ProjectTitleInput.propTypes = {
    className: PropTypes.string,
    intl: intlShape.isRequired,
    onSubmit: PropTypes.func,
    projectTitle: PropTypes.string,
    vm: PropTypes.object
};

const mapStateToProps = state => ({
    projectTitle: state.scratchGui.projectTitle,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onSubmit: title => dispatch(setProjectTitle(title))
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(ProjectTitleInput));
