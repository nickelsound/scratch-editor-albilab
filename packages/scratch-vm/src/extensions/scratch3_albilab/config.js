/**
 * Configuration for AlbiLAB API
 * @type {object}
 */
const AlbiLABConfig = {
    // IP address will be set dynamically via Scratch component
    baseURL: null,
    
    // API endpoints
    endpoints: {
        info: '/api/info',
        pump: '/pump',
        fan: '/fan',
        lights: '/lights',
        actuatorsConfig: '/api/actuators/config',
        actuatorsState: '/api/actuators/state',
        actuatorsControl: '/api/actuators/control',
        sensorsState: '/api/sensors/state',
        sensorsValues: '/api/sensors/values',
        automationState: '/api/automation/state',
        automationApply: '/api/automation/apply',
        ledRingsState: '/api/ledrings/state',
        ledRingsApply: '/api/ledrings/apply'
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
