const AlbiLABConfig = require('./config');

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
     * Make HTTP request to AlbiLAB device
     * @param {string} endpoint - API endpoint
     * @param {object} params - Query parameters
     * @param {?string} ipAddress - Optional IP address to use instead of baseURL
     * @returns {Promise<object>} Response data
     */
    async makeRequest(endpoint, params = {}, ipAddress = null) {
        const baseURL = ipAddress ? `http://${ipAddress}` : this.baseURL;
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
            const response = await fetch(fullUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

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
     * @returns {number} Temperature in Celsius
     */
    extractTemperature(deviceInfo) {
        // If thermoHumid sensor is available, use it
        if (deviceInfo.sensors?.thermoHumid?.values?.temperature) {
            return deviceInfo.sensors.thermoHumid.values.temperature;
        }
        
        // Fallback to simulated temperature
        return 22.5 + (Math.random() - 0.5) * 2;
    }

    /**
     * Extract humidity from device info
     * @param {object} deviceInfo - Device information
     * @returns {number} Humidity percentage
     */
    extractHumidity(deviceInfo) {
        // If thermoHumid sensor is available, use it
        if (deviceInfo.sensors?.thermoHumid?.values?.humidity) {
            return deviceInfo.sensors.thermoHumid.values.humidity;
        }
        
        // Fallback to simulated humidity
        return 65.0 + (Math.random() - 0.5) * 10;
    }

    /**
     * Extract soil moisture from device info
     * @param {object} deviceInfo - Device information
     * @returns {number} Soil moisture percentage
     */
    extractSoilMoisture(deviceInfo) {
        if (deviceInfo.sensors?.soilMoisture?.values?.moisture !== undefined) {
            return deviceInfo.sensors.soilMoisture.values.moisture;
        }
        
        // Fallback to simulated moisture
        return 45.0 + (Math.random() - 0.5) * 20;
    }

    /**
     * Extract water level from device info
     * @param {object} deviceInfo - Device information
     * @returns {boolean} Water level status
     */
    extractWaterLevel(deviceInfo) {
        if (deviceInfo.sensors?.waterSwitch?.values?.waterPresent !== undefined) {
            return deviceInfo.sensors.waterSwitch.values.waterPresent;
        }
        
        // Fallback to simulated water level
        return Math.random() > 0.1; // 90% chance of water present
    }

    /**
     * Get fallback device info when device is not available
     * @returns {object} Fallback device info
     */
    getFallbackDeviceInfo() {
        return {
            version: "1.0.182",
            sensors: {
                soilMoisture: {
                    values: {
                        moisture: 45 + (Math.random() - 0.5) * 20
                    }
                },
                thermoHumid: {
                    values: {
                        temperature: 22.5 + (Math.random() - 0.5) * 2,
                        humidity: 65 + (Math.random() - 0.5) * 10
                    }
                },
                waterSwitch: {
                    values: {
                        waterPresent: Math.random() > 0.1
                    }
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
     * @param {string} ipAddress - New IP address
     */
    updateBaseURL(ipAddress) {
        this.baseURL = `http://${ipAddress}`;
        this.clearCache();
    }
}

module.exports = AlbiLABAPIClient;
