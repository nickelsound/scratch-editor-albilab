const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const AlbiLABAPIClient = require('./api-client');
const {normalizeAddress} = require('./api-client');

// Czech translations for AlbiLAB blocks
const csTranslations = {
    'albilab.categoryName': 'AlbiLAB',
    'albilab.lightsOn': 'zapnout světla [ALBILAB]',
    'albilab.lightsOff': 'vypnout světla [ALBILAB]',
    'albilab.lightsCustom': 'rozsvítit světla červená [RED]% modrá [BLUE]% bílá [WHITE]% [ALBILAB]',
    'albilab.pumpOn': 'zapnout čerpadlo [ALBILAB]',
    'albilab.pumpOff': 'vypnout čerpadlo [ALBILAB]',
    'albilab.pumpOnFor': 'zapnout čerpadlo na [SECONDS] sekund [ALBILAB]',
    'albilab.pumpOffFor': 'vypnout čerpadlo na [SECONDS] sekund [ALBILAB]',
    'albilab.fanOn': 'zapnout větrák [ALBILAB]',
    'albilab.fanOff': 'vypnout větrák [ALBILAB]',
    'albilab.fanOnFor': 'zapnout větrák na [SECONDS] sekund [ALBILAB]',
    'albilab.getTemperature': 'teplota vzduchu [ALBILAB]',
    'albilab.getHumidity': 'vlhkost vzduchu [ALBILAB]',
    'albilab.getSoilMoisture': 'vlhkost půdy [ALBILAB]',
    'albilab.getWaterLevel': 'přítomnost vody v nádrži [ALBILAB]'
};

// Setup formatMessage with Czech translations on module load
const currentSetup = formatMessage.setup();
if (currentSetup && currentSetup.translations) {
    if (!currentSetup.translations.cs) {
        currentSetup.translations.cs = {};
    }
    Object.assign(currentSetup.translations.cs, csTranslations);
    formatMessage.setup(currentSetup);
} else {
    formatMessage.setup({
        locale: currentSetup?.locale || 'en',
        translations: {
            cs: csTranslations
        }
    });
}

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
        // Ensure Czech translations are available in formatMessage setup
        const currentSetup = formatMessage.setup();
        if (currentSetup && currentSetup.translations) {
            if (!currentSetup.translations.cs) {
                currentSetup.translations.cs = {};
            }
            Object.assign(currentSetup.translations.cs, csTranslations);
            formatMessage.setup(currentSetup);
        }
        
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
                        default: 'turn on lights [ALBILAB]',
                        description: 'Turn on lights'
                    }),
                    arguments: {
                        ALBILAB: {
                            type: ArgumentType.STRING,
                            defaultValue: '192.168.1.100'
                        }
                    }
                },
                {
                    opcode: 'lightsOff',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.lightsOff',
                        default: 'turn off lights [ALBILAB]',
                        description: 'Turn off lights'
                    }),
                    arguments: {
                        ALBILAB: {
                            type: ArgumentType.STRING,
                            defaultValue: '192.168.1.100'
                        }
                    }
                },
                        {
                            opcode: 'lightsCustom',
                            blockType: BlockType.COMMAND,
                            text: formatMessage({
                                id: 'albilab.lightsCustom',
                                default: 'set lights red [RED]% blue [BLUE]% white [WHITE]% [ALBILAB]',
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
                                },
                                ALBILAB: {
                                    type: ArgumentType.STRING,
                                    defaultValue: '192.168.1.100'
                                }
                            }
                        },
                // Pump control blocks
                {
                    opcode: 'pumpOn',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOn',
                        default: 'turn on pump [ALBILAB]',
                        description: 'Turn on pump'
                    }),
                    arguments: {
                        ALBILAB: {
                            type: ArgumentType.STRING,
                            defaultValue: '192.168.1.100'
                        }
                    }
                },
                {
                    opcode: 'pumpOff',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOff',
                        default: 'turn off pump [ALBILAB]',
                        description: 'Turn off pump'
                    }),
                    arguments: {
                        ALBILAB: {
                            type: ArgumentType.STRING,
                            defaultValue: '192.168.1.100'
                        }
                    }
                },
                {
                    opcode: 'pumpOnFor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOnFor',
                        default: 'turn on pump for [SECONDS] seconds [ALBILAB]',
                        description: 'Turn on pump for specified time'
                    }),
                    arguments: {
                        SECONDS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        },
                        ALBILAB: {
                            type: ArgumentType.STRING,
                            defaultValue: '192.168.1.100'
                        }
                    }
                },
                {
                    opcode: 'pumpOffFor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOffFor',
                        default: 'turn off pump for [SECONDS] seconds [ALBILAB]',
                        description: 'Turn off pump for specified time'
                    }),
                    arguments: {
                        SECONDS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        },
                        ALBILAB: {
                            type: ArgumentType.STRING,
                            defaultValue: '192.168.1.100'
                        }
                    }
                },
                // Fan control blocks
                {
                    opcode: 'fanOn',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.fanOn',
                        default: 'turn on fan [ALBILAB]',
                        description: 'Turn on fan'
                    }),
                    arguments: {
                        ALBILAB: {
                            type: ArgumentType.STRING,
                            defaultValue: '192.168.1.100'
                        }
                    }
                },
                        {
                            opcode: 'fanOff',
                            blockType: BlockType.COMMAND,
                            text: formatMessage({
                                id: 'albilab.fanOff',
                                default: 'turn off fan [ALBILAB]',
                                description: 'Turn off fan'
                            }),
                            arguments: {
                                ALBILAB: {
                                    type: ArgumentType.STRING,
                                    defaultValue: '192.168.1.100'
                                }
                            }
                        },
                        {
                            opcode: 'fanOnFor',
                            blockType: BlockType.COMMAND,
                            text: formatMessage({
                                id: 'albilab.fanOnFor',
                                default: 'turn on fan for [SECONDS] seconds [ALBILAB]',
                                description: 'Turn on fan for specified time'
                            }),
                            arguments: {
                                SECONDS: {
                                    type: ArgumentType.NUMBER,
                                    defaultValue: 60
                                },
                                ALBILAB: {
                                    type: ArgumentType.STRING,
                                    defaultValue: '192.168.1.100'
                                }
                            }
                        },
                // Sensor reading blocks
                {
                    opcode: 'getTemperature',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getTemperature',
                        default: 'air temperature [ALBILAB]',
                        description: 'Get air temperature'
                    }),
                    arguments: {
                        ALBILAB: {
                            type: ArgumentType.STRING,
                            defaultValue: '192.168.1.100'
                        }
                    }
                },
                {
                    opcode: 'getHumidity',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getHumidity',
                        default: 'air humidity [ALBILAB]',
                        description: 'Get air humidity'
                    }),
                    arguments: {
                        ALBILAB: {
                            type: ArgumentType.STRING,
                            defaultValue: '192.168.1.100'
                        }
                    }
                },
                {
                    opcode: 'getSoilMoisture',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getSoilMoisture',
                        default: 'soil moisture [ALBILAB]',
                        description: 'Get soil moisture'
                    }),
                    arguments: {
                        ALBILAB: {
                            type: ArgumentType.STRING,
                            defaultValue: '192.168.1.100'
                        }
                    }
                },
                        {
                            opcode: 'getWaterLevel',
                            blockType: BlockType.BOOLEAN,
                            text: formatMessage({
                                id: 'albilab.getWaterLevel',
                                default: 'water level in tank [ALBILAB]',
                                description: 'Check water level in tank'
                            }),
                            arguments: {
                                ALBILAB: {
                                    type: ArgumentType.STRING,
                                    defaultValue: '192.168.1.100'
                                }
                            }
                        }
            ],
            translation_map: {
                cs: {
                    'albilab.categoryName': 'AlbiLAB',
                    'albilab.lightsOn': 'zapnout světla [ALBILAB]',
                    'albilab.lightsOff': 'vypnout světla [ALBILAB]',
                    'albilab.lightsCustom': 'rozsvítit světla červená [RED]% modrá [BLUE]% bílá [WHITE]% [ALBILAB]',
                    'albilab.pumpOn': 'zapnout čerpadlo [ALBILAB]',
                    'albilab.pumpOff': 'vypnout čerpadlo [ALBILAB]',
                    'albilab.pumpOnFor': 'zapnout čerpadlo na [SECONDS] sekund [ALBILAB]',
                    'albilab.pumpOffFor': 'vypnout čerpadlo na [SECONDS] sekund [ALBILAB]',
                    'albilab.fanOn': 'zapnout větrák [ALBILAB]',
                    'albilab.fanOff': 'vypnout větrák [ALBILAB]',
                    'albilab.fanOnFor': 'zapnout větrák na [SECONDS] sekund [ALBILAB]',
                    'albilab.getTemperature': 'teplota vzduchu [ALBILAB]',
                    'albilab.getHumidity': 'vlhkost vzduchu [ALBILAB]',
                    'albilab.getSoilMoisture': 'vlhkost půdy [ALBILAB]',
                    'albilab.getWaterLevel': 'přítomnost vody v nádrži [ALBILAB]'
                }
            }
        };
    }

    // Light control methods
    async lightsOn (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for lightsOn`);
            return;
        }
        
        try {
            await this.apiClient.controlLights('on', {}, ipAddress);
            this.deviceState.lights.on = true;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Lights turned ON (IP: ${ipAddress})`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn on lights:`, error.message);
            // Fallback to local state
            this.deviceState.lights.on = true;
        }
    }

    async lightsOff (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for lightsOff`);
            return;
        }
        
        try {
            await this.apiClient.controlLights('off', {}, ipAddress);
            this.deviceState.lights.on = false;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Lights turned OFF (IP: ${ipAddress})`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn off lights:`, error.message);
            // Fallback to local state
            this.deviceState.lights.on = false;
        }
    }

    async lightsCustom (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for lightsCustom`);
            return;
        }
        
        try {
            // Limit values to 0-100 range
            const red = Math.max(0, Math.min(100, args.RED || 0));
            const blue = Math.max(0, Math.min(100, args.BLUE || 0));
            const white = Math.max(0, Math.min(100, args.WHITE || 0));
            
            const colors = { red, blue, white };
            await this.apiClient.controlLights('custom', colors, ipAddress);
            
            this.deviceState.lights.on = true;
            this.deviceState.lights.color = `R:${red}% B:${blue}% W:${white}%`;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Lights set to Red:${red}% Blue:${blue}% White:${white}% (IP: ${ipAddress})`);
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
    async pumpOn (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for pumpOn`);
            return;
        }
        
        try {
            await this.apiClient.controlPump('start', null, ipAddress);
            this.deviceState.pump.on = true;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Pump turned ON (IP: ${ipAddress})`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn on pump:`, error.message);
            // Fallback to local state
            this.deviceState.pump.on = true;
        }
    }

    async pumpOff (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for pumpOff`);
            return;
        }
        
        try {
            await this.apiClient.controlPump('stop', null, ipAddress);
            this.deviceState.pump.on = false;
            if (this.deviceState.pump.timer) {
                clearTimeout(this.deviceState.pump.timer);
                this.deviceState.pump.timer = null;
            }
            console.log(`[${new Date().toISOString()}] AlbiLAB: Pump turned OFF (IP: ${ipAddress})`);
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

    async pumpOnFor (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for pumpOnFor`);
            return;
        }
        
        const seconds = Math.max(1, Math.min(300, args.SECONDS)); // Limit 1-300 seconds
        
        try {
            await this.apiClient.controlPump('timed', seconds, ipAddress);
            this.deviceState.pump.on = true;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Pump turned ON for ${seconds} seconds (IP: ${ipAddress})`);

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

    async pumpOffFor (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for pumpOffFor`);
            return;
        }
        
        const seconds = Math.max(1, Math.min(300, args.SECONDS)); // Limit 1-300 seconds
        
        try {
            await this.apiClient.controlPump('stop', null, ipAddress);
            this.deviceState.pump.on = false;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Pump turned OFF for ${seconds} seconds (IP: ${ipAddress})`);

            setTimeout(async () => {
                try {
                    await this.apiClient.controlPump('start', null, ipAddress);
                    this.deviceState.pump.on = true;
                    console.log(`[${new Date().toISOString()}] AlbiLAB: Pump automatically turned ON (IP: ${ipAddress})`);
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
    async fanOn (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for fanOn`);
            return;
        }
        
        try {
            await this.apiClient.controlFan('start', null, ipAddress);
            this.deviceState.fan.on = true;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Fan turned ON (IP: ${ipAddress})`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to turn on fan:`, error.message);
            // Fallback to local state
            this.deviceState.fan.on = true;
        }
    }

    async fanOff (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for fanOff`);
            return;
        }
        
        try {
            await this.apiClient.controlFan('stop', null, ipAddress);
            this.deviceState.fan.on = false;
            if (this.deviceState.fan.timer) {
                clearTimeout(this.deviceState.fan.timer);
                this.deviceState.fan.timer = null;
            }
            console.log(`[${new Date().toISOString()}] AlbiLAB: Fan turned OFF (IP: ${ipAddress})`);
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

    async fanOnFor (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for fanOnFor`);
            return;
        }
        
        const seconds = Math.max(1, Math.min(300, args.SECONDS)); // Limit 1-300 seconds
        
        try {
            await this.apiClient.controlFan('timed', seconds, ipAddress);
            this.deviceState.fan.on = true;
            console.log(`[${new Date().toISOString()}] AlbiLAB: Fan turned ON for ${seconds} seconds (IP: ${ipAddress})`);

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
    async getTemperature (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for getTemperature`);
            return '';
        }
        
        try {
            const sensorData = await this.apiClient.getSensorData(ipAddress);
            this.deviceState.sensors.temperature = sensorData.temperature;
            return this.deviceState.sensors.temperature;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to get temperature:`, error.message);
            return '';
        }
    }

    async getHumidity (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for getHumidity`);
            return '';
        }
        
        try {
            const sensorData = await this.apiClient.getSensorData(ipAddress);
            this.deviceState.sensors.humidity = sensorData.humidity;
            return this.deviceState.sensors.humidity;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to get humidity:`, error.message);
            return '';
        }
    }

    async getSoilMoisture (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for getSoilMoisture`);
            return '';
        }
        
        try {
            const sensorData = await this.apiClient.getSensorData(ipAddress);
            this.deviceState.sensors.soilMoisture = sensorData.soilMoisture;
            return this.deviceState.sensors.soilMoisture;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to get soil moisture:`, error.message);
            return '';
        }
    }

    async getWaterLevel (args, util) {
        const ipAddress = this.getValidatedIP(args.ALBILAB);
        if (!ipAddress) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid IP address for getWaterLevel`);
            return false;
        }
        
        try {
            const sensorData = await this.apiClient.getSensorData(ipAddress);
            // Convert empty string to false for boolean block
            const waterLevel = sensorData.waterLevel === '' ? false : sensorData.waterLevel;
            this.deviceState.sensors.waterLevel = waterLevel;
            return this.deviceState.sensors.waterLevel;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AlbiLAB: Failed to get water level:`, error.message);
            return false;
        }
    }

    /**
     * Validate and normalize IP address, domain, or URL from arguments
     * @param {string} ipAddress - IP address, domain, or URL string
     * @returns {?string} Normalized URL or null if invalid
     */
    getValidatedIP(ipAddress) {
        if (!ipAddress || typeof ipAddress !== 'string') {
            return null;
        }
        
        const trimmedIP = ipAddress.trim();
        if (!trimmedIP) {
            return null;
        }
        
        // Use normalizeAddress from api-client
        const normalized = normalizeAddress(trimmedIP);
        
        if (normalized) {
            return normalized;
        }
        
        console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid address format: ${trimmedIP}`);
        return null;
    }
}

module.exports = Scratch3AlbiLABBlocks;
