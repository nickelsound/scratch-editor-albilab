/**
 * Configuration for AlbiLAB API
 * @type {object}
 */
const AlbiLABConfig = {
    // IP address will be set dynamically via Scratch component
    baseURL: null,
    
    // API endpoints
    endpoints: {
        info: '/info',
        pump: '/pump',
        fan: '/fan',
        lights: '/lights'
    },
    
    // Request timeout in milliseconds
    timeout: 5000,
    
    // Retry configuration
    retry: {
        attempts: 3,
        delay: 1000
    },
    
    // Device state cache duration (milliseconds)
    cacheDuration: 5000
};

module.exports = AlbiLABConfig;
