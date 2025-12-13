/**
 * API URL configuration for frontend
 */

/**
 * Detects if we're running in development environment
 */
const isDevelopment = () => {
    // Check environment variables (only if process exists)
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
        return true;
    }
    
    // Check if we have development API URL set (only if process exists)
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE_URL) {
        return true;
    }
    
    // Check if we're running on localhost (development environment)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return true;
    }
    
    return false;
};

/**
 * Gets base API URL
 */
export const getApiBaseUrl = () => {
    if (isDevelopment()) {
        // Development environment - connect directly to backend
        const devApiUrl = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE_URL) || 'http://localhost:3001';
        console.log('Development environment - using API URL:', devApiUrl);
        return devApiUrl;
    } else {
        // Production environment on Raspberry Pi:
        // Always use backend on port 3001 on the same host as the frontend.
        const apiPort = '3001';
        const apiUrl = `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
        console.log('Production environment - using API URL:', apiUrl);
        return apiUrl;
    }
};

/**
 * Gets WebSocket URL
 */
export const getWebSocketBaseUrl = () => {
    if (isDevelopment()) {
        // Development environment - connect directly to backend
        const devWsUrl = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_WS_BASE_URL) || 'ws://localhost:3001';
        console.log('Development environment - using WebSocket URL:', devWsUrl);
        return devWsUrl;
    } else {
        // Production environment on Raspberry Pi:
        // Always use backend WebSocket on port 3001 on the same host.
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsPort = '3001';
        const wsUrl = `${wsProtocol}//${window.location.hostname}:${wsPort}`;
        console.log('Production environment - using WebSocket URL:', wsUrl);
        return wsUrl;
    }
};

/**
 * Creates complete API URL for given endpoint
 */
export const getApiUrl = (endpoint) => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

/**
 * Creates complete WebSocket URL for given endpoint
 */
export const getWebSocketUrl = (endpoint) => {
    const baseUrl = getWebSocketBaseUrl();
    return `${baseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};
