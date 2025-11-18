import cookie from 'cookie';

import {DEFAULT_THEME, CAT_BLOCKS_THEME} from '.';

const COOKIE_KEY = 'scratchblockstheme';

const isValidTheme = theme => [DEFAULT_THEME, CAT_BLOCKS_THEME].includes(theme);

// TODO: This should also depend on membership status
const detectTheme = () => {
    const obj = cookie.parse(document.cookie) || {};
    const themeCookie = obj[COOKIE_KEY];

    if (isValidTheme(themeCookie)) return themeCookie;

    return DEFAULT_THEME;
};

const persistTheme = theme => {
    if (!isValidTheme(theme)) {
        throw new Error(`Invalid theme: ${theme}`);
    }

    const expires = new Date(new Date().setYear(new Date().getFullYear() + 1)).toUTCString();
    document.cookie = `${COOKIE_KEY}=${theme};expires=${expires};path=/`;
};

export {
    detectTheme,
    persistTheme
};
