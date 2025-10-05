/**
 * Konfigurace API URL pro frontend
 */

/**
 * Získá základní API URL z environment proměnných nebo použije fallback
 */
export const getApiBaseUrl = () => {
    // Zkus nejdříve environment proměnnou (funguje i v runtime)
    if (process.env.REACT_APP_API_BASE_URL) {
        console.log('Používám API URL z environment:', process.env.REACT_APP_API_BASE_URL);
        return process.env.REACT_APP_API_BASE_URL;
    }
    
    // Fallback pro development nebo pokud není nastaveno
    const fallbackUrl = `${window.location.protocol}//${window.location.hostname}:443`;
    console.log('Používám fallback API URL:', fallbackUrl);
    return fallbackUrl;
};

/**
 * Získá WebSocket URL z environment proměnných nebo použije fallback
 */
export const getWebSocketBaseUrl = () => {
    // Zkus nejdříve environment proměnnou (funguje i v runtime)
    if (process.env.REACT_APP_WS_BASE_URL) {
        console.log('Používám WebSocket URL z environment:', process.env.REACT_APP_WS_BASE_URL);
        return process.env.REACT_APP_WS_BASE_URL;
    }
    
    // Fallback pro development nebo pokud není nastaveno
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const fallbackUrl = `${wsProtocol}//${window.location.hostname}:443`;
    console.log('Používám fallback WebSocket URL:', fallbackUrl);
    return fallbackUrl;
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
