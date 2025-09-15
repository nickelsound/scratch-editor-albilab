const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');

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
                on: false
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
                    opcode: 'lightsColor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.lightsColor',
                        default: 'rozsvítit světla [COLOR]',
                        description: 'Set lights color'
                    }),
                    arguments: {
                        COLOR: {
                            type: ArgumentType.STRING,
                            menu: 'lightColors',
                            defaultValue: 'white'
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
                }
            ],
            menus: {
                lightColors: [
                    {text: 'bílá', value: 'white'},
                    {text: 'červená', value: 'red'},
                    {text: 'modrá', value: 'blue'}
                ]
            }
        };
    }

    // Light control methods
    lightsOn () {
        this.deviceState.lights.on = true;
        console.log('AlbiLAB: Lights turned ON');
    }

    lightsOff () {
        this.deviceState.lights.on = false;
        console.log('AlbiLAB: Lights turned OFF');
    }

    lightsColor (args) {
        this.deviceState.lights.on = true;
        this.deviceState.lights.color = args.COLOR;
        console.log(`AlbiLAB: Lights set to ${args.COLOR} color`);
    }

    // Pump control methods
    pumpOn () {
        this.deviceState.pump.on = true;
        console.log('AlbiLAB: Pump turned ON');
    }

    pumpOff () {
        this.deviceState.pump.on = false;
        if (this.deviceState.pump.timer) {
            clearTimeout(this.deviceState.pump.timer);
            this.deviceState.pump.timer = null;
        }
        console.log('AlbiLAB: Pump turned OFF');
    }

    pumpOnFor (args) {
        const seconds = Math.max(1, Math.min(300, args.SECONDS)); // Limit 1-300 seconds
        this.deviceState.pump.on = true;
        console.log(`AlbiLAB: Pump turned ON for ${seconds} seconds`);
        
        this.deviceState.pump.timer = setTimeout(() => {
            this.deviceState.pump.on = false;
            this.deviceState.pump.timer = null;
            console.log('AlbiLAB: Pump automatically turned OFF');
        }, seconds * 1000);
    }

    pumpOffFor (args) {
        const seconds = Math.max(1, Math.min(300, args.SECONDS)); // Limit 1-300 seconds
        this.deviceState.pump.on = false;
        console.log(`AlbiLAB: Pump turned OFF for ${seconds} seconds`);
        
        setTimeout(() => {
            this.deviceState.pump.on = true;
            console.log('AlbiLAB: Pump automatically turned ON');
        }, seconds * 1000);
    }

    // Fan control methods
    fanOn () {
        this.deviceState.fan.on = true;
        console.log('AlbiLAB: Fan turned ON');
    }

    fanOff () {
        this.deviceState.fan.on = false;
        console.log('AlbiLAB: Fan turned OFF');
    }

    // Sensor reading methods
    getTemperature () {
        // Simulate temperature reading with some variation
        const baseTemp = 22.5;
        const variation = (Math.random() - 0.5) * 2; // ±1°C variation
        this.deviceState.sensors.temperature = Math.round((baseTemp + variation) * 10) / 10;
        return this.deviceState.sensors.temperature;
    }

    getHumidity () {
        // Simulate humidity reading with some variation
        const baseHumidity = 65.0;
        const variation = (Math.random() - 0.5) * 10; // ±5% variation
        this.deviceState.sensors.humidity = Math.round((baseHumidity + variation) * 10) / 10;
        return this.deviceState.sensors.humidity;
    }

    getSoilMoisture () {
        // Simulate soil moisture reading with some variation
        const baseMoisture = 45.0;
        const variation = (Math.random() - 0.5) * 20; // ±10% variation
        this.deviceState.sensors.soilMoisture = Math.round((baseMoisture + variation) * 10) / 10;
        return this.deviceState.sensors.soilMoisture;
    }

    getWaterLevel () {
        // Simulate water level detection
        this.deviceState.sensors.waterLevel = Math.random() > 0.1; // 90% chance of water present
        return this.deviceState.sensors.waterLevel;
    }
}

module.exports = Scratch3AlbiLABBlocks;
