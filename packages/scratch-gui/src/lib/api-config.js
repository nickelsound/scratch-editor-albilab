/**
 * Konfigurace API URL pro frontend
 */

/**
 * Detekuje, zda běžíme ve vývojovém prostředí
 */
const isDevelopment = () => {
    // Zkontroluj environment proměnné (pouze pokud process existuje)
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
        return true;
    }
    
    // Zkontroluj, zda máme nastavené development API URL (pouze pokud process existuje)
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE_URL) {
        return true;
    }
    
    // Zkontroluj, zda běžíme na localhost (vývojové prostředí)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return true;
    }
    
    return false;
};

/**
 * Získá základní API URL
 */
export const getApiBaseUrl = () => {
    if (isDevelopment()) {
        // Vývojové prostředí - připoj se přímo na backend
        const devApiUrl = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE_URL) || 'http://localhost:3001';
        console.log('Vývojové prostředí - používám API URL:', devApiUrl);
        return devApiUrl;
    } else {
        // Produkční prostředí
        // Preferuj port z build-time proměnné (umožňuje měnit port bez změny kódu),
        // jinak fallback na původní chování (443 pro nginx proxy).
        const apiPort =
            (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_PORT) ||
            '443';
        const apiUrl = `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
        console.log('Produkční prostředí - používám API URL:', apiUrl);
        return apiUrl;
    }
};

/**
 * Získá WebSocket URL
 */
export const getWebSocketBaseUrl = () => {
    if (isDevelopment()) {
        // Vývojové prostředí - připoj se přímo na backend
        const devWsUrl = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_WS_BASE_URL) || 'ws://localhost:3001';
        console.log('Vývojové prostředí - používám WebSocket URL:', devWsUrl);
        return devWsUrl;
    } else {
        // Produkční prostředí
        // Preferuj port z build-time proměnné, jinak fallback na 443
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsPort =
            (typeof process !== 'undefined' && process.env && process.env.REACT_APP_WS_PORT) ||
            '443';
        const wsUrl = `${wsProtocol}//${window.location.hostname}:${wsPort}`;
        console.log('Produkční prostředí - používám WebSocket URL:', wsUrl);
        return wsUrl;
    }
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
