/**
 * Utility for managing AlbiLAB default IP address in localStorage
 */

const STORAGE_KEY = 'albilab-default-ip';
const PROMPT_SHOWN_KEY = 'albilab-ip-prompt-shown';

// IP address validation regex (same as in extension)
const IP_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * Get stored AlbiLAB IP address from localStorage
 * @returns {?string} IP address or null if not set
 */
const getAlbilabIP = () => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return null;
        }
        const ip = window.localStorage.getItem(STORAGE_KEY);
        if (ip && IP_REGEX.test(ip.trim())) {
            return ip.trim();
        }
        return null;
    } catch (error) {
        console.error('Error reading AlbiLAB IP from localStorage:', error);
        return null;
    }
};

/**
 * Set AlbiLAB IP address in localStorage
 * @param {string} ip - IP address to store
 * @returns {boolean} True if successfully stored, false otherwise
 */
const setAlbilabIP = (ip) => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return false;
        }
        
        const trimmedIP = ip.trim();
        if (!IP_REGEX.test(trimmedIP)) {
            console.error('Invalid IP address format:', trimmedIP);
            return false;
        }
        
        window.localStorage.setItem(STORAGE_KEY, trimmedIP);
        return true;
    } catch (error) {
        console.error('Error storing AlbiLAB IP to localStorage:', error);
        return false;
    }
};

/**
 * Clear stored AlbiLAB IP address
 */
const clearAlbilabIP = () => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing AlbiLAB IP from localStorage:', error);
    }
};

/**
 * Check if IP prompt has been shown to user
 * @returns {boolean} True if prompt was shown
 */
const hasPromptBeenShown = () => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return false;
        }
        return window.localStorage.getItem(PROMPT_SHOWN_KEY) === 'true';
    } catch (error) {
        return false;
    }
};

/**
 * Mark IP prompt as shown
 */
const markPromptAsShown = () => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return;
        }
        window.localStorage.setItem(PROMPT_SHOWN_KEY, 'true');
    } catch (error) {
        console.error('Error marking prompt as shown:', error);
    }
};

/**
 * Get default IP address - either from storage or fallback
 * @returns {string} IP address (default: '192.168.1.100')
 */
const getDefaultAlbilabIP = () => {
    const storedIP = getAlbilabIP();
    return storedIP || '192.168.1.100';
};

export {
    getAlbilabIP,
    setAlbilabIP,
    clearAlbilabIP,
    hasPromptBeenShown,
    markPromptAsShown,
    getDefaultAlbilabIP
};




