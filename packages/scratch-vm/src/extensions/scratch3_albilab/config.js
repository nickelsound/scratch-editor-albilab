/**
 * Configuration for AlbiLAB API
 * @type {object}
 */
const AlbiLABConfig = {
    // Default AlbiLAB device IP address
    baseURL: 'http://10.0.0.108',
    
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
    cacheDuration: 2000
};

module.exports = AlbiLABConfig;
