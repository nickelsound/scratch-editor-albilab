const AlbiLABConfig = require('./config');

/**
 * Normalize IP address or URL to full URL format
 * - IP address (10.0.0.10) -> http://10.0.0.10
 * - Domain (albilab.home) -> http://albilab.home
 * - https://neco -> https://neco:443 (if no port)
 * - If port already present, keep it
 * @param {string} address - IP address, domain, or URL
 * @returns {string} Normalized URL
 */
function normalizeAddress(address) {
    if (!address || typeof address !== 'string') {
        return null;
    }
    
    const trimmed = address.trim();
    if (!trimmed) {
        return null;
    }
    
    // Check if it already has a protocol
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        // Already has protocol
        try {
            const url = new URL(trimmed);
            // If https:// and no port specified, add :443
            if (url.protocol === 'https:' && !url.port) {
                url.port = '443';
            }
            return url.toString().replace(/\/$/, ''); // Remove trailing slash
        } catch (e) {
            // Invalid URL format
            return null;
        }
    }
    
    // No protocol - add http://
    try {
        const url = new URL(`http://${trimmed}`);
        return url.toString().replace(/\/$/, ''); // Remove trailing slash
    } catch (e) {
        // Invalid format
        return null;
    }
}

/**
 * AlbiLAB API Client
 * Handles communication with the AlbiLAB device
 */
class AlbiLABAPIClient {
    constructor() {
        this.baseURL = AlbiLABConfig.baseURL;
        this.timeout = AlbiLABConfig.timeout;
        this.cache = new Map();
        this.cacheDuration = AlbiLABConfig.cacheDuration;
    }

    /**
     * Make HTTPS request using https module with insecure agent
     * This allows connections to servers with self-signed certificates
     * @param {URL} urlObj - URL object
     * @param {AbortController} controller - Abort controller for timeout
     * @param {NodeJS.Timeout} timeoutId - Timeout ID
     * @param {number} startTime - Request start time
     * @returns {Promise<object>} Response data
     * @private
     */
    _makeHttpsRequest(urlObj, controller, timeoutId, startTime) {
        return new Promise((resolve, reject) => {
            // Use dynamic require to avoid webpack bundling issues
            // https is a built-in Node.js module that should be external
            let https;
            try {
                // eslint-disable-next-line no-eval
                https = eval('require')('https');
            } catch (e) {
                reject(new Error(`HTTPS module not available: ${e.message}`));
                return;
            }

            // Create insecure agent that ignores certificate validation
            const insecureAgent = new https.Agent({
                rejectUnauthorized: false
            });

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                agent: insecureAgent,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;

                // Log response details
                console.log(`[${new Date().toISOString()}] [AlbiLAB API] Response received in ${duration}ms`);
                console.log(`[${new Date().toISOString()}] [AlbiLAB API] Status: ${res.statusCode} ${res.statusMessage}`);
                console.log(`[${new Date().toISOString()}] [AlbiLAB API] Response headers:`, res.headers);

                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        console.error(`[${new Date().toISOString()}] [AlbiLAB API] Error response body:`, data);
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                        return;
                    }

                    try {
                        const jsonData = JSON.parse(data);
                        console.log(`[${new Date().toISOString()}] [AlbiLAB API] Response data:`, JSON.stringify(jsonData, null, 2));
                        resolve(jsonData);
                    } catch (e) {
                        reject(new Error(`Failed to parse JSON response: ${e.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                clearTimeout(timeoutId);
                reject(error);
            });

            // Handle abort signal
            if (controller.signal.aborted) {
                req.destroy();
                reject(new Error('Request aborted'));
                return;
            }

            controller.signal.addEventListener('abort', () => {
                req.destroy();
            });

            req.end();
        });
    }

    /**
     * Make HTTP request to AlbiLAB device
     * @param {string} endpoint - API endpoint
     * @param {object} params - Query parameters
     * @param {?string} ipAddress - Optional IP address, domain, or URL to use instead of baseURL
     * @returns {Promise<object>} Response data
     */
    async makeRequest(endpoint, params = {}, ipAddress = null) {
        const baseURL = ipAddress ? normalizeAddress(ipAddress) : this.baseURL;
        if (!baseURL) {
            throw new Error('Invalid address format');
        }
        const url = new URL(endpoint, baseURL);
        
        // Add query parameters
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        const fullUrl = url.toString();
        const startTime = Date.now();
        
        // Log request details with timestamp
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [AlbiLAB API] Making request to: ${fullUrl}`);
        console.log(`[${timestamp}] [AlbiLAB API] Request params:`, JSON.stringify(params, null, 2));
        console.log(`[${timestamp}] [AlbiLAB API] Timeout: ${this.timeout}ms`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log(`[${new Date().toISOString()}] [AlbiLAB API] Request timeout after ${this.timeout}ms for: ${fullUrl}`);
            controller.abort();
        }, this.timeout);

        try {
            const urlObj = new URL(fullUrl);
            
            // For HTTPS URLs, use https module with insecure agent to ignore certificate validation
            // This is necessary for home environments with self-signed certificates
            if (urlObj.protocol === 'https:') {
                const data = await this._makeHttpsRequest(urlObj, controller, timeoutId, startTime);
                clearTimeout(timeoutId);
                return data;
            }
            
            // For HTTP URLs, use standard fetch
            const fetchOptions = {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            };
            
            const response = await fetch(fullUrl, fetchOptions);

            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;

            // Log response details
            console.log(`[${new Date().toISOString()}] [AlbiLAB API] Response received in ${duration}ms`);
            console.log(`[${new Date().toISOString()}] [AlbiLAB API] Status: ${response.status} ${response.statusText}`);
            console.log(`[${new Date().toISOString()}] [AlbiLAB API] Response headers:`, Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[${new Date().toISOString()}] [AlbiLAB API] Error response body:`, errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`[${new Date().toISOString()}] [AlbiLAB API] Response data:`, JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            const duration = Date.now() - startTime;
            
            console.error(`[${new Date().toISOString()}] [AlbiLAB API] Request failed after ${duration}ms for: ${fullUrl}`);
            console.error(`[${new Date().toISOString()}] [AlbiLAB API] Error details:`, {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            if (error.name === 'AbortError') {
                throw new Error('Request timeout - AlbiLAB device not responding');
            }
            
            throw new Error(`AlbiLAB API error: ${error.message}`);
        }
    }

    /**
     * Get device information with caching
     * @param {?string} ipAddress - IP address to use for the request
     * @returns {Promise<object>} Device info
     */
    async getDeviceInfo(ipAddress = null) {
        // Use IP address as part of cache key to cache per device
        const cacheKey = `deviceInfo_${ipAddress || 'default'}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return cached.data;
        }

        try {
            const data = await this.makeRequest(AlbiLABConfig.endpoints.info, {}, ipAddress);
            
            // Cache the result keyed by IP address
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.warn(`[${new Date().toISOString()}] [AlbiLAB API] Failed to get device info:`, error.message);
            // Return fallback data if device is not available
            return this.getFallbackDeviceInfo();
        }
    }

    /**
     * Control pump
     * @param {string} action - 'start', 'stop', or 'timed'
     * @param {number} duration - Duration in seconds (for timed action)
     * @param {?string} ipAddress - Optional IP address to use instead of baseURL
     * @returns {Promise<object>} Response
     */
    async controlPump(action, duration = null, ipAddress = null) {
        console.log(`[${new Date().toISOString()}] [AlbiLAB API] Control pump called with action: ${action}, duration: ${duration}`);
        
        const params = { action };
        
        if (action === 'timed' && duration) {
            params.duration = Math.min(Math.max(duration, 1), 300); // Limit 1-300 seconds
            console.log(`[${new Date().toISOString()}] [AlbiLAB API] Pump timed action with duration: ${params.duration}s`);
        }

        try {
            const response = await this.makeRequest(AlbiLABConfig.endpoints.pump, params, ipAddress);
            console.log(`[${new Date().toISOString()}] [AlbiLAB API] Pump control successful:`, response);
            this.clearCache(); // Clear cache after state change
            return response;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] [AlbiLAB API] Pump control failed:`, error.message);
            throw error;
        }
    }

    /**
     * Control fan
     * @param {string} action - 'start', 'stop', or 'timed'
     * @param {number} duration - Duration in seconds (for timed action)
     * @param {?string} ipAddress - Optional IP address to use instead of baseURL
     * @returns {Promise<object>} Response
     */
    async controlFan(action, duration = null, ipAddress = null) {
        const params = { action };
        
        if (action === 'timed' && duration) {
            params.duration = Math.min(Math.max(duration, 1), 300); // Limit 1-300 seconds
        }

        try {
            const response = await this.makeRequest(AlbiLABConfig.endpoints.fan, params, ipAddress);
            this.clearCache(); // Clear cache after state change
            return response;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] [AlbiLAB API] Fan control failed:`, error.message);
            throw error;
        }
    }

    /**
     * Control lights
     * @param {string} action - 'on', 'off', or 'custom'
     * @param {object} colors - Color settings for custom action
     * @param {?string} ipAddress - Optional IP address to use instead of baseURL
     * @returns {Promise<object>} Response
     */
    async controlLights(action, colors = {}, ipAddress = null) {
        const params = { action };
        
        if (action === 'custom') {
            if (colors.red !== undefined) params.red = Math.min(Math.max(colors.red, 0), 100);
            if (colors.blue !== undefined) params.blue = Math.min(Math.max(colors.blue, 0), 100);
            if (colors.white !== undefined) params.white = Math.min(Math.max(colors.white, 0), 100);
        }

        try {
            const response = await this.makeRequest(AlbiLABConfig.endpoints.lights, params, ipAddress);
            this.clearCache(); // Clear cache after state change
            return response;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] [AlbiLAB API] Lights control failed:`, error.message);
            throw error;
        }
    }

    /**
     * Get sensor data from device info
     * @param {?string} ipAddress - Optional IP address to use instead of baseURL
     * @returns {Promise<object>} Sensor data
     */
    async getSensorData(ipAddress = null) {
        const deviceInfo = await this.getDeviceInfo(ipAddress);
        
        return {
            temperature: this.extractTemperature(deviceInfo),
            humidity: this.extractHumidity(deviceInfo),
            soilMoisture: this.extractSoilMoisture(deviceInfo),
            waterLevel: this.extractWaterLevel(deviceInfo)
        };
    }

    /**
     * Extract temperature from device info
     * @param {object} deviceInfo - Device information
     * @returns {number|string} Temperature in Celsius or empty string if sensor not available
     */
    extractTemperature(deviceInfo) {
        // Check if sensor is active (type is not "none")
        if (deviceInfo.sensors?.thermoHumid?.type === 'none') {
            return ''; // Sensor not available
        }
        
        // If thermoHumid sensor is available, use it
        if (deviceInfo.sensors?.thermoHumid?.values?.temperature !== undefined) {
            return deviceInfo.sensors.thermoHumid.values.temperature;
        }
        
        // No data available
        return '';
    }

    /**
     * Extract humidity from device info
     * @param {object} deviceInfo - Device information
     * @returns {number|string} Humidity percentage or empty string if sensor not available
     */
    extractHumidity(deviceInfo) {
        // Check if sensor is active (type is not "none")
        if (deviceInfo.sensors?.thermoHumid?.type === 'none') {
            return ''; // Sensor not available
        }
        
        // If thermoHumid sensor is available, use it
        if (deviceInfo.sensors?.thermoHumid?.values?.humidity !== undefined) {
            return deviceInfo.sensors.thermoHumid.values.humidity;
        }
        
        // No data available
        return '';
    }

    /**
     * Extract soil moisture from device info
     * @param {object} deviceInfo - Device information
     * @returns {number|string} Soil moisture percentage or empty string if sensor not available
     */
    extractSoilMoisture(deviceInfo) {
        // Check if sensor is active (type is not "none")
        if (deviceInfo.sensors?.soilMoisture?.type === 'none') {
            return ''; // Sensor not available
        }
        
        if (deviceInfo.sensors?.soilMoisture?.values?.moisture !== undefined) {
            return deviceInfo.sensors.soilMoisture.values.moisture;
        }
        
        // No data available
        return '';
    }

    /**
     * Extract water level from device info
     * @param {object} deviceInfo - Device information
     * @returns {boolean|string} Water level status or empty string if sensor not available
     */
    extractWaterLevel(deviceInfo) {
        // Check if sensor is active (type is not "none")
        if (deviceInfo.sensors?.waterSwitch?.type === 'none') {
            return ''; // Sensor not available
        }
        
        // Check for waterLowLevel (new API format) or waterPresent (old format)
        if (deviceInfo.sensors?.waterSwitch?.values?.waterLowLevel !== undefined) {
            return !deviceInfo.sensors.waterSwitch.values.waterLowLevel; // Invert: lowLevel = false means water present
        }
        
        if (deviceInfo.sensors?.waterSwitch?.values?.waterPresent !== undefined) {
            return deviceInfo.sensors.waterSwitch.values.waterPresent;
        }
        
        // No data available
        return '';
    }

    /**
     * Get fallback device info when device is not available
     * @returns {object} Fallback device info with all sensors disabled (type: "none")
     */
    getFallbackDeviceInfo() {
        return {
            version: "1.0.182",
            sensors: {
                soilMoisture: {
                    type: "none"
                },
                thermoHumid: {
                    type: "none"
                },
                waterSwitch: {
                    type: "none"
                }
            }
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Update base URL for device IP
     * @param {string} ipAddress - New IP address, domain, or URL
     */
    updateBaseURL(ipAddress) {
        const normalized = normalizeAddress(ipAddress);
        if (normalized) {
            this.baseURL = normalized;
            this.clearCache();
        }
    }
}

module.exports = AlbiLABAPIClient;
module.exports.normalizeAddress = normalizeAddress;
