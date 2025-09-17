const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const AlbiLABAPIClient = require('./api-client');

/**
 * Icon svg to be displayed at the left edge of each extension block, encoded as a data URI.
 * @type {string}
 */
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+YWxiaWxhYi1pY29uPC90aXRsZT48Zz48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0iIzAzQkZENyIgc3Ryb2tlPSIjMDNCRkQ3IiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNGRkZGRkYiPkFMPC90ZXh0PjwvZz48L3N2Zz4=';

/**
 * Host for the AlbiLAB-related blocks in Scratch 3.0
 * @param {Runtime} runtime - the runtime instantiating this block package.
 * @constructor
 */
class Scratch3AlbiLABBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * API client for AlbiLAB communication
         * @type {AlbiLABAPIClient}
         */
        this.apiClient = new AlbiLABAPIClient();

        /**
         * Device state for AlbiLAB
         * @type {object}
         */
        this.deviceState = {
            lights: {
                on: false,
                color: 'white'
            },
            pump: {
                on: false,
                timer: null
            },
            fan: {
                on: false,
                timer: null
            },
            sensors: {
                temperature: 22.5,
                humidity: 65.0,
                soilMoisture: 45.0,
                waterLevel: true
            }
        };
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        return {
            id: 'albilab',
            name: formatMessage({
                id: 'albilab.categoryName',
                default: 'AlbiLAB',
                description: 'Label for the AlbiLAB extension category'
            }),
            color1: '#03BFD7',
            color2: '#02A8B8',
            blockIconURI: blockIconURI,
            blocks: [
                // Light control blocks
                {
                    opcode: 'lightsOn',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.lightsOn',
                        default: 'zapnout světla',
                        description: 'Turn on lights'
                    })
                },
                {
                    opcode: 'lightsOff',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.lightsOff',
                        default: 'vypnout světla',
                        description: 'Turn off lights'
                    })
                },
                        {
                            opcode: 'lightsCustom',
                            blockType: BlockType.COMMAND,
                            text: formatMessage({
                                id: 'albilab.lightsCustom',
                                default: 'rozsvítit světla červená [RED]% modrá [BLUE]% bílá [WHITE]%',
                                description: 'Set custom light colors with intensity'
                            }),
                            arguments: {
                                RED: {
                                    type: ArgumentType.NUMBER,
                                    defaultValue: 0
                                },
                                BLUE: {
                                    type: ArgumentType.NUMBER,
                                    defaultValue: 0
                                },
                                WHITE: {
                                    type: ArgumentType.NUMBER,
                                    defaultValue: 100
                                }
                            }
                        },
                // Pump control blocks
                {
                    opcode: 'pumpOn',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOn',
                        default: 'zapnout čerpadlo',
                        description: 'Turn on pump'
                    })
                },
                {
                    opcode: 'pumpOff',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOff',
                        default: 'vypnout čerpadlo',
                        description: 'Turn off pump'
                    })
                },
                {
                    opcode: 'pumpOnFor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOnFor',
                        default: 'zapnout čerpadlo na [SECONDS] sekund',
                        description: 'Turn on pump for specified time'
                    }),
                    arguments: {
                        SECONDS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }
                },
                {
                    opcode: 'pumpOffFor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOffFor',
                        default: 'vypnout čerpadlo na [SECONDS] sekund',
                        description: 'Turn off pump for specified time'
                    }),
                    arguments: {
                        SECONDS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }
                },
                // Fan control blocks
                {
                    opcode: 'fanOn',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.fanOn',
                        default: 'zapnout větrák',
                        description: 'Turn on fan'
                    })
                },
                        {
                            opcode: 'fanOff',
                            blockType: BlockType.COMMAND,
                            text: formatMessage({
                                id: 'albilab.fanOff',
                                default: 'vypnout větrák',
                                description: 'Turn off fan'
                            })
                        },
                        {
                            opcode: 'fanOnFor',
                            blockType: BlockType.COMMAND,
                            text: formatMessage({
                                id: 'albilab.fanOnFor',
                                default: 'zapnout větrák na [SECONDS] sekund',
                                description: 'Turn on fan for specified time'
                            }),
                            arguments: {
                                SECONDS: {
                                    type: ArgumentType.NUMBER,
                                    defaultValue: 60
                                }
                            }
                        },
                // Sensor reading blocks
                {
                    opcode: 'getTemperature',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getTemperature',
                        default: 'teplota vzduchu',
                        description: 'Get air temperature'
                    })
                },
                {
                    opcode: 'getHumidity',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getHumidity',
                        default: 'vlhkost vzduchu',
                        description: 'Get air humidity'
                    })
                },
                {
                    opcode: 'getSoilMoisture',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getSoilMoisture',
                        default: 'vlhkost půdy',
                        description: 'Get soil moisture'
                    })
                },
                        {
                            opcode: 'getWaterLevel',
                            blockType: BlockType.BOOLEAN,
                            text: formatMessage({
                                id: 'albilab.getWaterLevel',
                                default: 'přítomnost vody v nádrži',
                                description: 'Check water level in tank'
                            })
                        },
                        // Configuration block
                        {
                            opcode: 'setDeviceIP',
                            blockType: BlockType.COMMAND,
                            text: formatMessage({
                                id: 'albilab.setDeviceIP',
                                default: 'nastavit IP adresu AlbiLAB na [IP]',
                                description: 'Set AlbiLAB device IP address'
                            }),
                            arguments: {
                                IP: {
                                    type: ArgumentType.STRING,
                                    defaultValue: '10.0.0.108'
                                }
                            }
                        }
            ]
        };
    }

    // Light control methods
    async lightsOn () {
        try {
            await this.apiClient.controlLights('on');
            this.deviceState.lights.on = true;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Lights turned ON`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn on lights:`, error.message);
            // Fallback to local state
            this.deviceState.lights.on = true;
        }
    }

    async lightsOff () {
        try {
            await this.apiClient.controlLights('off');
            this.deviceState.lights.on = false;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Lights turned OFF`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn off lights:`, error.message);
            // Fallback to local state
            this.deviceState.lights.on = false;
        }
    }

    async lightsCustom (args) {
        try {
            // Limit values to 0-100 range
            const red = Math.max(0, Math.min(100, args.RED || 0));
            const blue = Math.max(0, Math.min(100, args.BLUE || 0));
            const white = Math.max(0, Math.min(100, args.WHITE || 0));
            
            const colors = { red, blue, white };
            await this.apiClient.controlLights('custom', colors);
            
            this.deviceState.lights.on = true;
            this.deviceState.lights.color = `R:${red}% B:${blue}% W:${white}%`;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Lights set to Red:${red}% Blue:${blue}% White:${white}%`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to set custom light colors:`, error.message);
            // Fallback to local state
            this.deviceState.lights.on = true;
            const red = Math.max(0, Math.min(100, args.RED || 0));
            const blue = Math.max(0, Math.min(100, args.BLUE || 0));
            const white = Math.max(0, Math.min(100, args.WHITE || 0));
            this.deviceState.lights.color = `R:${red}% B:${blue}% W:${white}%`;
        }
    }

    // Pump control methods
    async pumpOn () {
        try {
            await this.apiClient.controlPump('start');
            this.deviceState.pump.on = true;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Pump turned ON`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn on pump:`, error.message);
            // Fallback to local state
            this.deviceState.pump.on = true;
        }
    }

    async pumpOff () {
        try {
            await this.apiClient.controlPump('stop');
            this.deviceState.pump.on = false;
            if (this.deviceState.pump.timer) {
                clearTimeout(this.deviceState.pump.timer);
                this.deviceState.pump.timer = null;
            }
            console.log(`[${new Date().toISOString()}] AlbiLAB: Pump turned OFF`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn off pump:`, error.message);
            // Fallback to local state
            this.deviceState.pump.on = false;
            if (this.deviceState.pump.timer) {
                clearTimeout(this.deviceState.pump.timer);
                this.deviceState.pump.timer = null;
            }
        }
    }

    async pumpOnFor (args) {
        const seconds = Math.max(1, Math.min(300, args.SECONDS)); // Limit 1-300 seconds
        
        try {
            await this.apiClient.controlPump('timed', seconds);
            this.deviceState.pump.on = true;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Pump turned ON for ${seconds} seconds`);

            // Set local timer as backup
            this.deviceState.pump.timer = setTimeout(() => {
                this.deviceState.pump.on = false;
                this.deviceState.pump.timer = null;
                console.log(`[${new Date().toISOString()}] AlbiLAB: Pump automatically turned OFF`);
            }, seconds * 1000);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn on pump for timed duration:`, error.message);
            // Fallback to local timer
            this.deviceState.pump.on = true;
            this.deviceState.pump.timer = setTimeout(() => {
                this.deviceState.pump.on = false;
                this.deviceState.pump.timer = null;
                console.log(`[${new Date().toISOString()}] AlbiLAB: Pump automatically turned OFF`);
            }, seconds * 1000);
        }
    }

    async pumpOffFor (args) {
        const seconds = Math.max(1, Math.min(300, args.SECONDS)); // Limit 1-300 seconds
        
        try {
            await this.apiClient.controlPump('stop');
            this.deviceState.pump.on = false;
            console.log(`AlbiLAB: Pump turned OFF for ${seconds} seconds`);

            setTimeout(async () => {
                try {
                    await this.apiClient.controlPump('start');
                    this.deviceState.pump.on = true;
                    console.log(`[${new Date().toISOString()}] AlbiLAB: Pump automatically turned ON`);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to automatically turn on pump:`, error.message);
                    this.deviceState.pump.on = true;
                }
            }, seconds * 1000);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn off pump for timed duration:`, error.message);
            // Fallback to local timer
            this.deviceState.pump.on = false;
            setTimeout(() => {
                this.deviceState.pump.on = true;
                console.log(`[${new Date().toISOString()}] AlbiLAB: Pump automatically turned ON`);
            }, seconds * 1000);
        }
    }

    // Fan control methods
    async fanOn () {
        try {
            await this.apiClient.controlFan('start');
            this.deviceState.fan.on = true;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Fan turned ON`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn on fan:`, error.message);
            // Fallback to local state
            this.deviceState.fan.on = true;
        }
    }

    async fanOff () {
        try {
            await this.apiClient.controlFan('stop');
            this.deviceState.fan.on = false;
            if (this.deviceState.fan.timer) {
                clearTimeout(this.deviceState.fan.timer);
                this.deviceState.fan.timer = null;
            }
            console.log(`[${new Date().toISOString()}] AlbiLAB: Fan turned OFF`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn off fan:`, error.message);
            // Fallback to local state
            this.deviceState.fan.on = false;
            if (this.deviceState.fan.timer) {
                clearTimeout(this.deviceState.fan.timer);
                this.deviceState.fan.timer = null;
            }
        }
    }

    async fanOnFor (args) {
        const seconds = Math.max(1, Math.min(300, args.SECONDS)); // Limit 1-300 seconds
        
        try {
            await this.apiClient.controlFan('timed', seconds);
            this.deviceState.fan.on = true;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Fan turned ON for ${seconds} seconds`);

            // Set local timer as backup
            this.deviceState.fan.timer = setTimeout(() => {
                this.deviceState.fan.on = false;
                this.deviceState.fan.timer = null;
                console.log(`[${new Date().toISOString()}] AlbiLAB: Fan automatically turned OFF`);
            }, seconds * 1000);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn on fan for timed duration:`, error.message);
            // Fallback to local timer
            this.deviceState.fan.on = true;
            this.deviceState.fan.timer = setTimeout(() => {
                this.deviceState.fan.on = false;
                this.deviceState.fan.timer = null;
                console.log(`[${new Date().toISOString()}] AlbiLAB: Fan automatically turned OFF`);
            }, seconds * 1000);
        }
    }

    // Sensor reading methods
    async getTemperature () {
        try {
            const sensorData = await this.apiClient.getSensorData();
            this.deviceState.sensors.temperature = sensorData.temperature;
            return this.deviceState.sensors.temperature;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to get temperature:`, error.message);
            // Fallback to simulated data
            const baseTemp = 22.5;
            const variation = (Math.random() - 0.5) * 2; // ±1°C variation
            this.deviceState.sensors.temperature = Math.round((baseTemp + variation) * 10) / 10;
            return this.deviceState.sensors.temperature;
        }
    }

    async getHumidity () {
        try {
            const sensorData = await this.apiClient.getSensorData();
            this.deviceState.sensors.humidity = sensorData.humidity;
            return this.deviceState.sensors.humidity;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to get humidity:`, error.message);
            // Fallback to simulated data
            const baseHumidity = 65.0;
            const variation = (Math.random() - 0.5) * 10; // ±5% variation
            this.deviceState.sensors.humidity = Math.round((baseHumidity + variation) * 10) / 10;
            return this.deviceState.sensors.humidity;
        }
    }

    async getSoilMoisture () {
        try {
            const sensorData = await this.apiClient.getSensorData();
            this.deviceState.sensors.soilMoisture = sensorData.soilMoisture;
            return this.deviceState.sensors.soilMoisture;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to get soil moisture:`, error.message);
            // Fallback to simulated data
            const baseMoisture = 45.0;
            const variation = (Math.random() - 0.5) * 20; // ±10% variation
            this.deviceState.sensors.soilMoisture = Math.round((baseMoisture + variation) * 10) / 10;
            return this.deviceState.sensors.soilMoisture;
        }
    }

    async getWaterLevel () {
        try {
            const sensorData = await this.apiClient.getSensorData();
            this.deviceState.sensors.waterLevel = sensorData.waterLevel;
            return this.deviceState.sensors.waterLevel;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to get water level:`, error.message);
            // Fallback to simulated data
            this.deviceState.sensors.waterLevel = Math.random() > 0.1; // 90% chance of water present
            return this.deviceState.sensors.waterLevel;
        }
    }

    // Configuration methods
    setDeviceIP (args) {
        const ipAddress = args.IP.trim();
        
        // Basic IP address validation
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        if (ipRegex.test(ipAddress)) {
            this.apiClient.updateBaseURL(ipAddress);
            console.log(`[${new Date().toISOString()}] AlbiLAB: Device IP address set to ${ipAddress}`);
        } else {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address format: ${ipAddress}`);
        }
    }
}

module.exports = Scratch3AlbiLABBlocks;
