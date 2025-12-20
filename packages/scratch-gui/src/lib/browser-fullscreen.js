/**
 * Helper functions for browser fullscreen API
 * Works on both desktop and mobile devices
 */

/**
 * Request fullscreen mode
 * @returns {Promise} Promise that resolves when fullscreen is entered
 */
export function requestFullscreen() {
    const element = document.documentElement;
    
    if (element.requestFullscreen) {
        return element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
        return element.webkitRequestFullscreen();
    } else if (element.webkitRequestFullScreen) {
        return element.webkitRequestFullScreen();
    } else if (element.mozRequestFullScreen) {
        return element.mozRequestFullScreen();
    } else if (element.msRequestFullscreen) {
        return element.msRequestFullscreen();
    }
    
    return Promise.reject(new Error('Fullscreen API not supported'));
}

/**
 * Exit fullscreen mode
 * @returns {Promise} Promise that resolves when fullscreen is exited
 */
export function exitFullscreen() {
    if (document.exitFullscreen) {
        return document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        return document.webkitExitFullscreen();
    } else if (document.webkitCancelFullScreen) {
        return document.webkitCancelFullScreen();
    } else if (document.mozCancelFullScreen) {
        return document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
        return document.msExitFullscreen();
    }
    
    return Promise.reject(new Error('Fullscreen API not supported'));
}

/**
 * Check if fullscreen is currently active
 * @returns {boolean} True if fullscreen is active
 */
export function isFullscreen() {
    return !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.webkitCurrentFullScreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );
}

/**
 * Toggle fullscreen mode
 * @returns {Promise} Promise that resolves when fullscreen state changes
 */
export function toggleFullscreen() {
    if (isFullscreen()) {
        return exitFullscreen();
    } else {
        return requestFullscreen();
    }
}

