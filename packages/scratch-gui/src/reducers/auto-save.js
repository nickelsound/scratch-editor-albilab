const SET_AUTO_SAVE_STATUS = 'scratch-gui/auto-save/SET_AUTO_SAVE_STATUS';
const SET_LAST_SAVE_TIME = 'scratch-gui/auto-save/SET_LAST_SAVE_TIME';
const SET_SAVE_ERROR = 'scratch-gui/auto-save/SET_SAVE_ERROR';

const initialState = {
    isSaving: false,
    lastSaveTime: null,
    saveError: null
};

const reducer = function (state, action) {
    if (typeof state === 'undefined') state = initialState;
    
    switch (action.type) {
    case SET_AUTO_SAVE_STATUS:
        return {
            ...state,
            isSaving: action.isSaving
        };
    case SET_LAST_SAVE_TIME:
        return {
            ...state,
            lastSaveTime: action.lastSaveTime,
            saveError: null // Clear error on successful save
        };
    case SET_SAVE_ERROR:
        return {
            ...state,
            saveError: action.error,
            isSaving: false
        };
    default:
        return state;
    }
};

const setAutoSaveStatus = function (isSaving) {
    return {
        type: SET_AUTO_SAVE_STATUS,
        isSaving: isSaving
    };
};

const setLastSaveTime = function (lastSaveTime) {
    return {
        type: SET_LAST_SAVE_TIME,
        lastSaveTime: lastSaveTime
    };
};

const setSaveError = function (error) {
    return {
        type: SET_SAVE_ERROR,
        error: error
    };
};

export {
    reducer as default,
    setAutoSaveStatus,
    setLastSaveTime,
    setSaveError
};
