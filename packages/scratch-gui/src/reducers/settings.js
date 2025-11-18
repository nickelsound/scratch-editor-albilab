import {detectColorMode} from '../lib/settings/color-mode/persistence';

const SET_COLOR_MODE = 'scratch-gui/settings/SET_COLOR_MODE';

const initialState = {
    colorMode: detectColorMode()
};

const reducer = (state = initialState, action) => {
    switch (action.type) {
    case SET_COLOR_MODE:
        return {...state, colorMode: action.colorMode};
    default:
        return state;
    }
};

const setColorMode = colorMode => ({
    type: SET_COLOR_MODE,
    colorMode
});

export {
    reducer as default,
    initialState as settingsInitialState,
    setColorMode
};
