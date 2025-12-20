const TOGGLE_STAGE_VISIBILITY = 'scratch-gui/stage-visibility/TOGGLE_STAGE_VISIBILITY';
const SET_STAGE_VISIBILITY = 'scratch-gui/stage-visibility/SET_STAGE_VISIBILITY';

const initialState = {
    isVisible: true
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    switch (action.type) {
    case TOGGLE_STAGE_VISIBILITY:
        return Object.assign({}, state, {
            isVisible: !state.isVisible
        });
    case SET_STAGE_VISIBILITY:
        return Object.assign({}, state, {
            isVisible: action.isVisible
        });
    default:
        return state;
    }
};

const toggleStageVisibility = function () {
    return {
        type: TOGGLE_STAGE_VISIBILITY
    };
};

const setStageVisibility = function (isVisible) {
    return {
        type: SET_STAGE_VISIBILITY,
        isVisible: isVisible
    };
};

export {
    reducer as default,
    initialState as stageVisibilityInitialState,
    toggleStageVisibility,
    setStageVisibility
};

