import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, {useMemo} from 'react';
import {FormattedMessage} from 'react-intl';
import {connect} from 'react-redux';

import LanguageMenu from './language-menu.jsx';
import MenuBarMenu from './menu-bar-menu.jsx';
import {MenuSection} from '../menu/menu.jsx';
import PreferenceMenu from './preference-menu.jsx';

import {DEFAULT_MODE, HIGH_CONTRAST_MODE, colorModeMap} from '../../lib/settings/color-mode/index.js';
import {themeMap} from '../../lib/settings/theme/index.js';
import {persistColorMode} from '../../lib/settings/color-mode/persistence.js';
import {persistTheme} from '../../lib/settings/theme/persistence.js';
import {setColorMode, setTheme} from '../../reducers/settings.js';

import menuBarStyles from './menu-bar.css';
import styles from './settings-menu.css';

import dropdownCaret from './dropdown-caret.svg';
import settingsIcon from './icon--settings.svg';
import themeIcon from '../../lib/assets/icon--theme.svg';

const enabledColorModes = [DEFAULT_MODE, HIGH_CONTRAST_MODE];

const SettingsMenu = ({
    canChangeLanguage,
    canChangeColorMode,
    canChangeTheme,
    isRtl,
    activeColorMode,
    onChangeColorMode,
    activeTheme,
    onChangeTheme,
    onRequestClose,
    onRequestOpen,
    settingsMenuOpen
}) => {
    const enabledColorModesMap = useMemo(() => Object.keys(colorModeMap).reduce((acc, colorMode) => {
        if (enabledColorModes.includes(colorMode)) {
            acc[colorMode] = colorModeMap[colorMode];
        }
        return acc;
    }, {}), []);

    return (
        <div
            className={classNames(menuBarStyles.menuBarItem, menuBarStyles.hoverable, menuBarStyles.colorModeMenu, {
                [menuBarStyles.active]: settingsMenuOpen
            })}
            onClick={onRequestOpen}
        >
            <img
                src={settingsIcon}
            />
            <span className={styles.dropdownLabel}>
                <FormattedMessage
                    defaultMessage="Settings"
                    description="Settings menu"
                    id="gui.menuBar.settings"
                />
            </span>
            <img src={dropdownCaret} />
            <MenuBarMenu
                className={menuBarStyles.menuBarMenu}
                open={settingsMenuOpen}
                place={isRtl ? 'left' : 'right'}
                onRequestClose={onRequestClose}
            >
                <MenuSection>
                    {canChangeLanguage && <LanguageMenu onRequestCloseSettings={onRequestClose} />}
                    {canChangeTheme && <PreferenceMenu
                        itemsMap={themeMap}
                        onChange={onChangeTheme}
                        defaultMenuIconSrc={themeIcon}
                        submenuLabel={{
                            defaultMessage: 'Theme',
                            description: 'Theme sub-menu',
                            id: 'gui.menuBar.theme'
                        }}
                        selectedItemKey={activeTheme}
                        isRtl={isRtl}
                        onRequestCloseSettings={onRequestClose}
                    />}
                    {canChangeColorMode && <PreferenceMenu
                        itemsMap={enabledColorModesMap}
                        onChange={onChangeColorMode}
                        submenuLabel={{
                            defaultMessage: 'Color Mode',
                            description: 'Color mode sub-menu',
                            id: 'gui.menuBar.colorMode'
                        }}
                        selectedItemKey={activeColorMode}
                        isRtl={isRtl}
                        onRequestCloseSettings={onRequestClose}
                    />}
                </MenuSection>
            </MenuBarMenu>
        </div>
    );
};

SettingsMenu.propTypes = {
    canChangeLanguage: PropTypes.bool,
    canChangeColorMode: PropTypes.bool,
    canChangeTheme: PropTypes.bool,
    isRtl: PropTypes.bool,
    activeColorMode: PropTypes.string,
    onChangeColorMode: PropTypes.func,
    activeTheme: PropTypes.string,
    onChangeTheme: PropTypes.func,
    onRequestClose: PropTypes.func,
    onRequestOpen: PropTypes.func,
    settingsMenuOpen: PropTypes.bool
};

const mapStateToProps = state => ({
    activeColorMode: state.scratchGui.settings.colorMode,
    activeTheme: state.scratchGui.settings.theme
});

const mapDispatchToProps = (dispatch, ownProps) => ({
    onChangeColorMode: colorMode => {
        dispatch(setColorMode(colorMode));
        ownProps.onRequestClose();
        persistColorMode(colorMode);
    },
    onChangeTheme: theme => {
        dispatch(setTheme(theme));
        ownProps.onRequestClose();
        persistTheme(theme);
    }
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(SettingsMenu);
