/**
 * Konfigurace API URL pro frontend
 */

/**
 * Získá základní API URL - používá nginx proxy na portu 443
 */
export const getApiBaseUrl = () => {
    // Vždy použij nginx proxy na portu 443
    const apiUrl = `${window.location.protocol}//${window.location.hostname}:443`;
    console.log('Používám API URL:', apiUrl);
    return apiUrl;
};

/**
 * Získá WebSocket URL - používá nginx proxy na portu 443
 */
export const getWebSocketBaseUrl = () => {
    // Vždy použij nginx proxy na portu 443
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:443`;
    console.log('Používám WebSocket URL:', wsUrl);
    return wsUrl;
};

/**
 * Vytvoří kompletní API URL pro daný endpoint
 */
export const getApiUrl = (endpoint) => {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

/**
 * Vytvoří kompletní WebSocket URL pro daný endpoint
 */
export const getWebSocketUrl = (endpoint) => {
    const baseUrl = getWebSocketBaseUrl();
    return `${baseUrl}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};
