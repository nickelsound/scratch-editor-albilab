const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const AlbiLABAPIClient = require('./api-client');
const {normalizeAddress} = require('./api-client');

const DEFAULT_ADDRESS = '192.168.1.100';
const DISCOVERY_CACHE_MS = 5000;

const ACTUATOR_MENU_FALLBACKS = {
    waterPump: [{text: 'Pump 1', value: 'actuator|waterPump||0|Pump%201'}],
    fan: [{text: 'Fan 1', value: 'actuator|fan||0|Fan%201'}]
};

const LIGHT_MENU_FALLBACK = [{text: 'Light 1', value: 'light|||0|Light%201'}];

const SENSOR_MENU_FALLBACKS = {
    temperature: [{text: 'Temperature sensor 1', value: 'sensor|temperature||0|Temperature%20sensor%201'}],
    humidity: [{text: 'Humidity sensor 1', value: 'sensor|humidity||0|Humidity%20sensor%201'}],
    soil: [{text: 'Soil moisture 1', value: 'sensor|soil||0|Soil%20moisture%201'}],
    water: [{text: 'Water level 1', value: 'sensor|water||0|Water%20level%201'}],
    co2: [{text: 'CO2 sensor 1', value: 'sensor|co2||0|CO2%20sensor%201'}],
    flow: [{text: 'Flow meter 1', value: 'sensor|flow||0|Flow%20meter%201'}],
    airQuality: [{text: 'Air quality 1', value: 'sensor|airQuality||0|Air%20quality%201'}]
};

// Czech translations for AlbiLAB blocks
const csTranslations = {
    'albilab.categoryName': 'AlbiLAB',
    'albilab.lightsOn': 'zapnout svetla [LIGHT] [ALBILAB]',
    'albilab.lightsOff': 'vypnout svetla [LIGHT] [ALBILAB]',
    'albilab.lightsCustom': 'rozsvitit svetla [LIGHT] cervena [RED]% modra [BLUE]% bila [WHITE]% [ALBILAB]',
    'albilab.pumpOn': 'zapnout cerpadlo [PUMP] [ALBILAB]',
    'albilab.pumpOff': 'vypnout cerpadlo [PUMP] [ALBILAB]',
    'albilab.pumpOnFor': 'zapnout cerpadlo [PUMP] na [SECONDS] sekund [ALBILAB]',
    'albilab.pumpOffFor': 'vypnout cerpadlo [PUMP] na [SECONDS] sekund [ALBILAB]',
    'albilab.fanOn': 'zapnout vetrak [FAN] [ALBILAB]',
    'albilab.fanOff': 'vypnout vetrak [FAN] [ALBILAB]',
    'albilab.fanOnFor': 'zapnout vetrak [FAN] na [SECONDS] sekund [ALBILAB]',
    'albilab.getTemperature': 'teplota [SENSOR] [ALBILAB]',
    'albilab.getHumidity': 'vlhkost [SENSOR] [ALBILAB]',
    'albilab.getSoilMoisture': 'vlhkost pudy [SENSOR] [ALBILAB]',
    'albilab.getWaterLevel': 'pritomnost vody [SENSOR] [ALBILAB]',
    'albilab.getCO2': 'CO2 [SENSOR] [ALBILAB]',
    'albilab.getFlowRate': 'prutok vody [SENSOR] [ALBILAB]',
    'albilab.getTotalVolume': 'protekl objem [SENSOR] [ALBILAB]',
    'albilab.getPM25': 'PM2.5 [SENSOR] [ALBILAB]'
};

const enTranslations = {
    'albilab.categoryName': 'AlbiLAB',
    'albilab.lightsOn': 'turn on lights [LIGHT] [ALBILAB]',
    'albilab.lightsOff': 'turn off lights [LIGHT] [ALBILAB]',
    'albilab.lightsCustom': 'set lights [LIGHT] red [RED]% blue [BLUE]% white [WHITE]% [ALBILAB]',
    'albilab.pumpOn': 'turn on pump [PUMP] [ALBILAB]',
    'albilab.pumpOff': 'turn off pump [PUMP] [ALBILAB]',
    'albilab.pumpOnFor': 'turn on pump [PUMP] for [SECONDS] seconds [ALBILAB]',
    'albilab.pumpOffFor': 'turn off pump [PUMP] for [SECONDS] seconds [ALBILAB]',
    'albilab.fanOn': 'turn on fan [FAN] [ALBILAB]',
    'albilab.fanOff': 'turn off fan [FAN] [ALBILAB]',
    'albilab.fanOnFor': 'turn on fan [FAN] for [SECONDS] seconds [ALBILAB]',
    'albilab.getTemperature': 'temperature [SENSOR] [ALBILAB]',
    'albilab.getHumidity': 'humidity [SENSOR] [ALBILAB]',
    'albilab.getSoilMoisture': 'soil moisture [SENSOR] [ALBILAB]',
    'albilab.getWaterLevel': 'water present [SENSOR] [ALBILAB]',
    'albilab.getCO2': 'CO2 [SENSOR] [ALBILAB]',
    'albilab.getFlowRate': 'water flow rate [SENSOR] [ALBILAB]',
    'albilab.getTotalVolume': 'total water volume [SENSOR] [ALBILAB]',
    'albilab.getPM25': 'PM2.5 [SENSOR] [ALBILAB]'
};

const installTranslations = () => {
    const currentSetup = formatMessage.setup() || {};
    const translations = Object.assign({}, currentSetup.translations || {});
    translations.cs = Object.assign({}, translations.cs || {}, csTranslations);
    translations.en = Object.assign({}, translations.en || {}, enTranslations);
    formatMessage.setup(Object.assign({}, currentSetup, {
        locale: currentSetup.locale || 'en',
        translations
    }));
};

installTranslations();

// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU+YWxiaWxhYi1pY29uPC90aXRsZT48Zz48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxOCIgZmlsbD0iIzAzQkZENyIgc3Ryb2tlPSIjMDNCRkQ3IiBzdHJva2Utd2lkdGg9IjIiLz48dGV4dCB4PSIyMCIgeT0iMjYiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNGRkZGRkYiPkFMPC90ZXh0PjwvZz48L3N2Zz4=';

const normalizeType = type => {
    const value = String(type || '').replace(/[_\-\s]/g, '').toLowerCase();
    if (value === 'waterpump') return 'waterPump';
    if (value === 'fan') return 'fan';
    return String(type || '');
};

const normalizeSensorKey = key => String(key || '').replace(/[_\-\s]/g, '').toLowerCase();

const clampPercent = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number)));
};

const clampSeconds = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 1;
    return Math.max(1, Math.min(300, number));
};

const isUsableNumber = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));

const tokenFor = (kind, item = {}) => [
    kind,
    item.type || '',
    item.id === undefined || item.id === null ? '' : String(item.id),
    item.index === undefined || item.index === null ? '' : String(item.index),
    encodeURIComponent(item.name || '')
].join('|');

const parseToken = value => {
    if (typeof value !== 'string') return null;
    const parts = value.split('|');
    if (parts.length < 4) return null;
    return {
        kind: parts[0],
        type: parts[1] || '',
        id: parts[2] || '',
        index: parts[3] === '' ? null : Number(parts[3]),
        name: decodeURIComponent(parts[4] || '')
    };
};

const menuItemFor = (kind, item) => ({
    text: item.enabled === false ? `${item.name} (disabled)` : item.name,
    value: tokenFor(kind, item)
});

const arrayFromPayload = payload => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.actuators)) return payload.actuators;
    if (payload && Array.isArray(payload.state)) return payload.state;
    return [];
};

const cloneJson = value => JSON.parse(JSON.stringify(value || {}));

const metricFields = {
    temperature: ['temperature', 'value'],
    humidity: ['humidity'],
    soil: ['value'],
    co2: ['co2', 'value'],
    flowRate: ['flow_rate', 'flow_lpm', 'value'],
    totalVolume: ['total_volume', 'total_l'],
    pm25: ['pm2_5', 'pm2p5', 'value']
};

class Scratch3AlbiLABBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this.apiClient = new AlbiLABAPIClient();
        this.discovery = this._emptyDiscovery();

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
                temperature: '',
                humidity: '',
                soilMoisture: '',
                waterLevel: false,
                co2: '',
                flowRate: '',
                totalVolume: '',
                pm25: ''
            }
        };
    }

    _emptyDiscovery () {
        return {
            address: null,
            fetchedAt: 0,
            refreshPromise: null,
            actuators: [],
            sensors: [],
            sensorValues: {},
            lightings: [],
            ledRings: [],
            supportsActuatorsApi: false,
            supportsLightingApi: false
        };
    }

    getInfo () {
        installTranslations();

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
                {
                    opcode: 'lightsOn',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.lightsOn',
                        default: 'turn on lights [LIGHT] [ALBILAB]',
                        description: 'Turn on lights'
                    }),
                    arguments: this._lightArguments()
                },
                {
                    opcode: 'lightsOff',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.lightsOff',
                        default: 'turn off lights [LIGHT] [ALBILAB]',
                        description: 'Turn off lights'
                    }),
                    arguments: this._lightArguments()
                },
                {
                    opcode: 'lightsCustom',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.lightsCustom',
                        default: 'set lights [LIGHT] red [RED]% blue [BLUE]% white [WHITE]% [ALBILAB]',
                        description: 'Set custom light colors with intensity'
                    }),
                    arguments: Object.assign({
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
                    }, this._lightArguments())
                },
                {
                    opcode: 'pumpOn',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOn',
                        default: 'turn on pump [PUMP] [ALBILAB]',
                        description: 'Turn on pump'
                    }),
                    arguments: this._actuatorArguments('PUMP', 'pumpMenu')
                },
                {
                    opcode: 'pumpOff',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOff',
                        default: 'turn off pump [PUMP] [ALBILAB]',
                        description: 'Turn off pump'
                    }),
                    arguments: this._actuatorArguments('PUMP', 'pumpMenu')
                },
                {
                    opcode: 'pumpOnFor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOnFor',
                        default: 'turn on pump [PUMP] for [SECONDS] seconds [ALBILAB]',
                        description: 'Turn on pump for specified time'
                    }),
                    arguments: Object.assign({
                        SECONDS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }, this._actuatorArguments('PUMP', 'pumpMenu'))
                },
                {
                    opcode: 'pumpOffFor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.pumpOffFor',
                        default: 'turn off pump [PUMP] for [SECONDS] seconds [ALBILAB]',
                        description: 'Turn off pump for specified time'
                    }),
                    arguments: Object.assign({
                        SECONDS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 5
                        }
                    }, this._actuatorArguments('PUMP', 'pumpMenu'))
                },
                {
                    opcode: 'fanOn',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.fanOn',
                        default: 'turn on fan [FAN] [ALBILAB]',
                        description: 'Turn on fan'
                    }),
                    arguments: this._actuatorArguments('FAN', 'fanMenu')
                },
                {
                    opcode: 'fanOff',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.fanOff',
                        default: 'turn off fan [FAN] [ALBILAB]',
                        description: 'Turn off fan'
                    }),
                    arguments: this._actuatorArguments('FAN', 'fanMenu')
                },
                {
                    opcode: 'fanOnFor',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilab.fanOnFor',
                        default: 'turn on fan [FAN] for [SECONDS] seconds [ALBILAB]',
                        description: 'Turn on fan for specified time'
                    }),
                    arguments: Object.assign({
                        SECONDS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 60
                        }
                    }, this._actuatorArguments('FAN', 'fanMenu'))
                },
                {
                    opcode: 'getTemperature',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getTemperature',
                        default: 'temperature [SENSOR] [ALBILAB]',
                        description: 'Get air temperature'
                    }),
                    arguments: this._sensorArguments('temperatureSensorMenu')
                },
                {
                    opcode: 'getHumidity',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getHumidity',
                        default: 'humidity [SENSOR] [ALBILAB]',
                        description: 'Get air humidity'
                    }),
                    arguments: this._sensorArguments('humiditySensorMenu')
                },
                {
                    opcode: 'getSoilMoisture',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getSoilMoisture',
                        default: 'soil moisture [SENSOR] [ALBILAB]',
                        description: 'Get soil moisture'
                    }),
                    arguments: this._sensorArguments('soilSensorMenu')
                },
                {
                    opcode: 'getWaterLevel',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'albilab.getWaterLevel',
                        default: 'water present [SENSOR] [ALBILAB]',
                        description: 'Check water level in tank'
                    }),
                    arguments: this._sensorArguments('waterSensorMenu')
                },
                {
                    opcode: 'getCO2',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getCO2',
                        default: 'CO2 [SENSOR] [ALBILAB]',
                        description: 'Get CO2 value'
                    }),
                    arguments: this._sensorArguments('co2SensorMenu')
                },
                {
                    opcode: 'getFlowRate',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getFlowRate',
                        default: 'water flow rate [SENSOR] [ALBILAB]',
                        description: 'Get water flow rate'
                    }),
                    arguments: this._sensorArguments('flowSensorMenu')
                },
                {
                    opcode: 'getTotalVolume',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getTotalVolume',
                        default: 'total water volume [SENSOR] [ALBILAB]',
                        description: 'Get total water volume'
                    }),
                    arguments: this._sensorArguments('flowSensorMenu')
                },
                {
                    opcode: 'getPM25',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilab.getPM25',
                        default: 'PM2.5 [SENSOR] [ALBILAB]',
                        description: 'Get PM2.5 air quality value'
                    }),
                    arguments: this._sensorArguments('airQualitySensorMenu')
                }
            ],
            menus: {
                pumpMenu: {
                    acceptReporters: true,
                    items: 'getPumpMenu'
                },
                fanMenu: {
                    acceptReporters: true,
                    items: 'getFanMenu'
                },
                lightMenu: {
                    acceptReporters: true,
                    items: 'getLightMenu'
                },
                temperatureSensorMenu: {
                    acceptReporters: true,
                    items: 'getTemperatureSensorMenu'
                },
                humiditySensorMenu: {
                    acceptReporters: true,
                    items: 'getHumiditySensorMenu'
                },
                soilSensorMenu: {
                    acceptReporters: true,
                    items: 'getSoilSensorMenu'
                },
                waterSensorMenu: {
                    acceptReporters: true,
                    items: 'getWaterSensorMenu'
                },
                co2SensorMenu: {
                    acceptReporters: true,
                    items: 'getCO2SensorMenu'
                },
                flowSensorMenu: {
                    acceptReporters: true,
                    items: 'getFlowSensorMenu'
                },
                airQualitySensorMenu: {
                    acceptReporters: true,
                    items: 'getAirQualitySensorMenu'
                }
            },
            translation_map: {
                cs: csTranslations
            }
        };
    }

    _deviceAddressArguments () {
        return {
            ALBILAB: {
                type: ArgumentType.STRING,
                defaultValue: DEFAULT_ADDRESS
            }
        };
    }

    _actuatorArguments (argumentName, menuName) {
        return Object.assign({
            [argumentName]: {
                type: ArgumentType.STRING,
                menu: menuName,
                defaultValue: ''
            }
        }, this._deviceAddressArguments());
    }

    _lightArguments () {
        return Object.assign({
            LIGHT: {
                type: ArgumentType.STRING,
                menu: 'lightMenu',
                defaultValue: ''
            }
        }, this._deviceAddressArguments());
    }

    _sensorArguments (menuName) {
        return Object.assign({
            SENSOR: {
                type: ArgumentType.STRING,
                menu: menuName,
                defaultValue: ''
            }
        }, this._deviceAddressArguments());
    }

    getPumpMenu () {
        return this._getActuatorMenu('waterPump');
    }

    getFanMenu () {
        return this._getActuatorMenu('fan');
    }

    getLightMenu () {
        this._startBackgroundRefresh();
        const items = this.discovery.lightings
            .map(item => menuItemFor('light', item));
        return items.length ? items : LIGHT_MENU_FALLBACK;
    }

    getTemperatureSensorMenu () {
        return this._getSensorMenu('temperature');
    }

    getHumiditySensorMenu () {
        return this._getSensorMenu('humidity');
    }

    getSoilSensorMenu () {
        return this._getSensorMenu('soil');
    }

    getWaterSensorMenu () {
        return this._getSensorMenu('water');
    }

    getCO2SensorMenu () {
        return this._getSensorMenu('co2');
    }

    getFlowSensorMenu () {
        return this._getSensorMenu('flow');
    }

    getAirQualitySensorMenu () {
        return this._getSensorMenu('airQuality');
    }

    _getActuatorMenu (type) {
        this._startBackgroundRefresh();
        const items = this.discovery.actuators
            .filter(item => item.type === type)
            .filter(item => item.enabled !== false)
            .map(item => menuItemFor('actuator', item));
        return items.length ? items : ACTUATOR_MENU_FALLBACKS[type];
    }

    _getSensorMenu (kind) {
        this._startBackgroundRefresh();
        const items = this.discovery.sensors
            .filter(item => this._sensorMatchesKind(item, kind))
            .filter(item => item.enabled !== false)
            .map(item => menuItemFor('sensor', Object.assign({}, item, {type: kind})));
        return items.length ? items : SENSOR_MENU_FALLBACKS[kind];
    }

    _startBackgroundRefresh () {
        const address = this.getPreferredAddress();
        if (!address) return;
        if (this.discovery.refreshPromise) return;
        if (this.discovery.address === address && Date.now() - this.discovery.fetchedAt < DISCOVERY_CACHE_MS) return;
        this.refreshDiscovery(address).catch(error => {
            console.warn(`[${new Date().toISOString()}] AlbiLAB: discovery refresh failed:`, error.message);
        });
    }

    async refreshDiscovery (ipAddress = null, force = false) {
        const address = this.getValidatedIP(ipAddress || this.getPreferredAddress());
        if (!address) return this.discovery;
        if (!force && this.discovery.address === address && Date.now() - this.discovery.fetchedAt < DISCOVERY_CACHE_MS) {
            return this.discovery;
        }
        if (this.discovery.refreshPromise) {
            return this.discovery.refreshPromise;
        }

        this.discovery.refreshPromise = this._loadDiscovery(address)
            .then(next => {
                this.discovery = next;
                return this.discovery;
            })
            .finally(() => {
                this.discovery.refreshPromise = null;
            });

        return this.discovery.refreshPromise;
    }

    async _loadDiscovery (address) {
        const [
            actuatorConfigResult,
            actuatorStateResult,
            sensorStateResult,
            sensorValuesResult,
            automationResult,
            ledRingsResult
        ] = await Promise.allSettled([
            this.apiClient.getActuatorsConfig(address),
            this.apiClient.getActuatorsState(address),
            this.apiClient.getSensorsState(address),
            this.apiClient.getSensorsValues(address),
            this.apiClient.getAutomationState(address),
            this.apiClient.getLedRingsState(address)
        ]);

        const actuatorConfig = this._settledValue(actuatorConfigResult, []);
        const actuatorState = this._settledValue(actuatorStateResult, []);
        const sensorState = this._settledValue(sensorStateResult, {});
        const sensorValues = this._settledValue(sensorValuesResult, {});
        const automation = this._settledValue(automationResult, {});
        const ledRings = this._settledValue(ledRingsResult, {});

        return {
            address,
            fetchedAt: Date.now(),
            refreshPromise: null,
            actuators: this._buildActuatorList(actuatorConfig, actuatorState),
            sensors: this._buildSensorList(sensorState, sensorValues),
            sensorValues,
            lightings: this._buildLightingList(automation),
            ledRings: Array.isArray(ledRings.rings) ? ledRings.rings : [],
            supportsActuatorsApi: actuatorConfigResult.status === 'fulfilled' ||
                actuatorStateResult.status === 'fulfilled',
            supportsLightingApi: automationResult.status === 'fulfilled' ||
                ledRingsResult.status === 'fulfilled'
        };
    }

    _settledValue (result, fallback) {
        return result.status === 'fulfilled' ? result.value : fallback;
    }

    _buildActuatorList (configPayload, statePayload) {
        const config = arrayFromPayload(configPayload);
        const state = arrayFromPayload(statePayload);
        const source = config.length ? config : state;
        return source.map((raw, index) => {
            const runtime = state[index] || {};
            const type = normalizeType(raw.type || runtime.type);
            const name = String(raw.name || runtime.name || (type === 'fan' ? `Fan ${index + 1}` : `Pump ${index + 1}`));
            return {
                id: raw.id === undefined || raw.id === null ? '' : String(raw.id),
                index,
                type,
                name,
                enabled: raw.enabled !== false && runtime.enabled !== false
            };
        });
    }

    _buildLightingList (automationPayload) {
        const lightings = Array.isArray(automationPayload.lightings) ? automationPayload.lightings : [];
        const count = lightings.length || 1;
        const output = [];
        for (let index = 0; index < count; index++) {
            const lighting = lightings[index] || {};
            output.push({
                id: lighting.id === undefined || lighting.id === null ? '' : String(lighting.id),
                index: Number.isFinite(Number(lighting.index)) ? Number(lighting.index) : index,
                type: 'light',
                name: lighting.name || `Light ${index + 1}`,
                enabled: true
            });
        }
        return output;
    }

    _buildSensorList (statePayload, valuesPayload) {
        const fromState = this._flattenSensorsState(statePayload);
        if (fromState.length) {
            return fromState;
        }
        return this._flattenSensorsValues(valuesPayload);
    }

    _flattenSensorsState (statePayload) {
        const classes = statePayload && Array.isArray(statePayload.classes) ? statePayload.classes : [];
        const typeCounts = {};
        const output = [];
        classes.forEach(classNode => {
            const types = Array.isArray(classNode.types) ? classNode.types : [];
            types.forEach(typeNode => {
                const typeKey = typeNode.key || typeNode.meta_key || 'sensor';
                const sensors = Array.isArray(typeNode.sensors) ? typeNode.sensors : [];
                sensors.forEach(sensor => {
                    const index = typeCounts[typeKey] || 0;
                    typeCounts[typeKey] = index + 1;
                    output.push({
                        id: sensor.id === undefined || sensor.id === null ? '' : String(sensor.id),
                        index,
                        typeKey,
                        metaKey: typeNode.meta_key || typeKey,
                        classKey: classNode.key || '',
                        name: String(sensor.name || typeNode.label || `Sensor ${output.length + 1}`),
                        enabled: sensor.enabled !== false
                    });
                });
            });
        });
        return output;
    }

    _flattenSensorsValues (valuesPayload) {
        if (!valuesPayload || typeof valuesPayload !== 'object') return [];
        const output = [];
        Object.keys(valuesPayload).forEach(typeKey => {
            const readings = Array.isArray(valuesPayload[typeKey]) ? valuesPayload[typeKey] : [];
            readings.forEach((reading, index) => {
                output.push({
                    id: reading.id === undefined || reading.id === null ? '' : String(reading.id),
                    index,
                    typeKey,
                    metaKey: typeKey,
                    classKey: '',
                    name: String(reading.name || `Sensor ${output.length + 1}`),
                    enabled: reading.enabled !== false
                });
            });
        });
        return output;
    }

    _sensorMatchesKind (sensor, kind) {
        const typeKey = normalizeSensorKey(sensor.typeKey);
        const metaKey = normalizeSensorKey(sensor.metaKey);
        const classKey = normalizeSensorKey(sensor.classKey);
        if (kind === 'temperature') {
            return classKey === 'temperature' ||
                classKey === 'temperaturehumidity' ||
                ['ds18b20', 'bme280', 'dht11', 'dht22', 'sht31', 'sht40', 'scd41'].includes(typeKey) ||
                ['ds18b20', 'bme280', 'dht11', 'dht22', 'sht31', 'sht40', 'scd41'].includes(metaKey);
        }
        if (kind === 'humidity') {
            return ['bme280', 'dht11', 'dht22', 'sht31', 'sht40', 'scd41'].includes(typeKey) ||
                ['bme280', 'dht11', 'dht22', 'sht31', 'sht40', 'scd41'].includes(metaKey);
        }
        if (kind === 'soil') {
            return classKey === 'soilmoisture' || typeKey === 'soilmoisture' || metaKey === 'soilmoisture';
        }
        if (kind === 'water') {
            return classKey === 'waterlevel' ||
                ['wlsalbilab', 'wlsmechanical', 'waterlevelalbilab', 'waterlevelswitch'].includes(typeKey) ||
                ['wlsalbilab', 'wlsmechanical', 'waterlevelalbilab', 'waterlevelswitch'].includes(metaKey);
        }
        if (kind === 'co2') {
            return classKey === 'co2' || typeKey === 'scd41' || metaKey === 'scd41';
        }
        if (kind === 'flow') {
            return classKey === 'flow' || typeKey === 'flowmeter' || metaKey === 'flowmeter';
        }
        if (kind === 'airQuality') {
            return classKey === 'airquality' || typeKey === 'sps30' || metaKey === 'sps30';
        }
        return false;
    }

    async lightsOn (args) {
        await this._controlLightsV2(args, 'on');
    }

    async lightsOff (args) {
        await this._controlLightsV2(args, 'off');
    }

    async lightsCustom (args) {
        await this._controlLightsV2(args, 'custom');
    }

    async _controlLightsV2 (args, action) {
        const ipAddress = this.getValidatedIP(args.ALBILAB || this.getPreferredAddress());
        if (!ipAddress) return;

        try {
            await this.refreshDiscovery(ipAddress, action !== 'custom');
            const light = this._resolveLighting(args.LIGHT);
            if (!light) throw new Error('No lighting channel available');

            if (action === 'custom') {
                const red = clampPercent(args.RED);
                const blue = clampPercent(args.BLUE);
                const white = clampPercent(args.WHITE);
                const ledState = await this.apiClient.getLedRingsState(ipAddress);
                const rings = Array.isArray(ledState.rings) ? cloneJson(ledState.rings) : [];
                while (rings.length <= light.index) {
                    rings.push({
                        enabled: true,
                        running: true,
                        pwm: {r: 0, b: 0, w: 0},
                        count: {r: 1, b: 1, w: 1}
                    });
                }
                rings[light.index] = Object.assign({}, rings[light.index], {
                    enabled: true,
                    running: true,
                    pwm: {r: red, b: blue, w: white}
                });
                await this.apiClient.applyLedRingsState({
                    rings,
                    show_no_rings_labels: ledState.show_no_rings_labels,
                    automation: {
                        _persist: false,
                        lightings: [{
                            index: light.index,
                            mode: 'manual',
                            manual_output: true
                        }]
                    }
                }, ipAddress);
                this.deviceState.lights.color = `R:${red}% B:${blue}% W:${white}%`;
            } else {
                const automation = await this.apiClient.getAutomationState(ipAddress);
                const lightings = Array.isArray(automation.lightings) ? cloneJson(automation.lightings) : [];
                while (lightings.length <= light.index) {
                    lightings.push({index: lightings.length});
                }
                lightings[light.index] = Object.assign({}, lightings[light.index], {
                    index: light.index,
                    mode: action === 'on' ? 'manual' : 'off',
                    manual_output: action === 'on'
                });
                await this.apiClient.applyAutomationState({lightings}, ipAddress, false);
            }

            this.deviceState.lights.on = action !== 'off';
        } catch (error) {
            console.warn(`[${new Date().toISOString()}] AlbiLAB: firmware 2.0 light control failed:`, error.message);
            if (this.discovery.supportsLightingApi) {
                return;
            }
            await this._controlLegacyLights(action, args, ipAddress);
        }
    }

    async _controlLegacyLights (action, args, ipAddress) {
        const colors = action === 'custom' ? {
            red: clampPercent(args.RED),
            blue: clampPercent(args.BLUE),
            white: clampPercent(args.WHITE)
        } : {};
        await this.apiClient.controlLights(action, colors, ipAddress);
        this.deviceState.lights.on = action !== 'off';
    }

    async pumpOn (args) {
        await this._controlActuator(args, 'waterPump', args.PUMP, 'start', null);
    }

    async pumpOff (args) {
        await this._controlActuator(args, 'waterPump', args.PUMP, 'stop', null);
    }

    async pumpOnFor (args) {
        await this._controlActuator(args, 'waterPump', args.PUMP, 'start', clampSeconds(args.SECONDS) * 1000);
    }

    async pumpOffFor (args) {
        const seconds = clampSeconds(args.SECONDS);
        const ipAddress = this.getValidatedIP(args.ALBILAB || this.getPreferredAddress());
        if (!ipAddress) return;
        const actuator = await this._controlActuator(
            Object.assign({}, args, {ALBILAB: ipAddress}),
            'waterPump',
            args.PUMP,
            'stop',
            null,
            true
        );
        if (actuator) {
            setTimeout(() => {
                this.apiClient.controlActuator(actuator.index, 'start', null, null, ipAddress)
                    .catch(error => console.warn(`[${new Date().toISOString()}] AlbiLAB: failed to restart pump:`, error.message));
            }, seconds * 1000);
            return;
        }
        if (this.discovery.supportsActuatorsApi) {
            return;
        }
        setTimeout(() => {
            this.apiClient.controlPump('start', null, ipAddress)
                .catch(error => console.warn(`[${new Date().toISOString()}] AlbiLAB: failed to restart legacy pump:`, error.message));
        }, seconds * 1000);
    }

    async fanOn (args) {
        await this._controlActuator(args, 'fan', args.FAN, 'start', null);
    }

    async fanOff (args) {
        await this._controlActuator(args, 'fan', args.FAN, 'stop', null);
    }

    async fanOnFor (args) {
        await this._controlActuator(args, 'fan', args.FAN, 'start', clampSeconds(args.SECONDS) * 1000);
    }

    async _controlActuator (args, type, selection, action, durationMs = null, returnActuator = false) {
        const ipAddress = this.getValidatedIP(args.ALBILAB || this.getPreferredAddress());
        if (!ipAddress) return null;

        try {
            await this.refreshDiscovery(ipAddress, true);
            const actuator = this._resolveActuator(type, selection);
            if (!actuator) throw new Error(`No ${type} actuator available`);
            await this.apiClient.controlActuator(actuator.index, action, durationMs, null, ipAddress);
            this.deviceState[type === 'fan' ? 'fan' : 'pump'].on = action === 'start';
            return returnActuator ? actuator : null;
        } catch (error) {
            console.warn(`[${new Date().toISOString()}] AlbiLAB: firmware 2.0 actuator control failed:`, error.message);
            if (this.discovery.supportsActuatorsApi) {
                return null;
            }
            await this._controlLegacyActuator(type, action, durationMs, ipAddress);
            return null;
        }
    }

    async _controlLegacyActuator (type, action, durationMs, ipAddress) {
        const legacyAction = action === 'start' && durationMs ? 'timed' : action;
        const seconds = durationMs ? Math.round(durationMs / 1000) : null;
        if (type === 'fan') {
            await this.apiClient.controlFan(legacyAction, seconds, ipAddress);
            this.deviceState.fan.on = action === 'start';
            return;
        }
        await this.apiClient.controlPump(legacyAction, seconds, ipAddress);
        this.deviceState.pump.on = action === 'start';
    }

    async getTemperature (args) {
        const value = await this._getNumericSensorMetric(args, 'temperature', metricFields.temperature);
        if (value !== '') {
            this.deviceState.sensors.temperature = value;
            return value;
        }
        return this._getLegacySensorMetric(args, 'temperature');
    }

    async getHumidity (args) {
        const value = await this._getNumericSensorMetric(args, 'humidity', metricFields.humidity);
        if (value !== '') {
            this.deviceState.sensors.humidity = value;
            return value;
        }
        return this._getLegacySensorMetric(args, 'humidity');
    }

    async getSoilMoisture (args) {
        const value = await this._getNumericSensorMetric(args, 'soil', metricFields.soil);
        if (value !== '') {
            this.deviceState.sensors.soilMoisture = value;
            return value;
        }
        return this._getLegacySensorMetric(args, 'soilMoisture');
    }

    async getWaterLevel (args) {
        const ipAddress = this.getValidatedIP(args.ALBILAB || this.getPreferredAddress());
        if (!ipAddress) return false;
        try {
            const reading = await this._getSensorReading(args, 'water', ipAddress);
            if (!reading) return false;
            if (typeof reading.wet === 'boolean') return reading.wet;
            if (reading.waterPresent !== undefined) return !!reading.waterPresent;
            if (reading.value !== undefined) return Number(reading.value) > 0;
            return false;
        } catch (error) {
            console.warn(`[${new Date().toISOString()}] AlbiLAB: water level read failed:`, error.message);
            const legacy = await this._getLegacySensorMetric(args, 'waterLevel');
            return legacy === '' ? false : !!legacy;
        }
    }

    async getCO2 (args) {
        return this._getNumericSensorMetric(args, 'co2', metricFields.co2);
    }

    async getFlowRate (args) {
        return this._getNumericSensorMetric(args, 'flow', metricFields.flowRate);
    }

    async getTotalVolume (args) {
        return this._getNumericSensorMetric(args, 'flow', metricFields.totalVolume);
    }

    async getPM25 (args) {
        return this._getNumericSensorMetric(args, 'airQuality', metricFields.pm25);
    }

    async _getNumericSensorMetric (args, kind, fields) {
        const ipAddress = this.getValidatedIP(args.ALBILAB || this.getPreferredAddress());
        if (!ipAddress) return '';
        try {
            const reading = await this._getSensorReading(args, kind, ipAddress);
            if (!reading) return '';
            for (const field of fields) {
                if (isUsableNumber(reading[field])) return Number(reading[field]);
            }
            return '';
        } catch (error) {
            console.warn(`[${new Date().toISOString()}] AlbiLAB: sensor read failed:`, error.message);
            return '';
        }
    }

    async _getSensorReading (args, kind, ipAddress) {
        await this.refreshDiscovery(ipAddress, false);
        const values = await this.apiClient.getSensorsValues(ipAddress);
        this.discovery.sensorValues = values;
        const sensor = this._resolveSensor(kind, args.SENSOR);
        if (sensor) {
            const group = Array.isArray(values[sensor.typeKey]) ? values[sensor.typeKey] : [];
            const reading = group[sensor.index];
            if (reading) return reading;
        }
        return this._firstMatchingReading(values, kind);
    }

    _firstMatchingReading (values, kind) {
        for (const typeKey of Object.keys(values || {})) {
            const candidate = {
                typeKey,
                metaKey: typeKey,
                classKey: ''
            };
            if (!this._sensorMatchesKind(candidate, kind)) continue;
            const group = Array.isArray(values[typeKey]) ? values[typeKey] : [];
            const reading = group.find(item => item && item.enabled !== false) || group[0];
            if (reading) return reading;
        }
        return null;
    }

    async _getLegacySensorMetric (args, key) {
        const ipAddress = this.getValidatedIP(args.ALBILAB || this.getPreferredAddress());
        if (!ipAddress) return key === 'waterLevel' ? false : '';
        try {
            const sensorData = await this.apiClient.getSensorData(ipAddress);
            return sensorData[key] === undefined ? '' : sensorData[key];
        } catch (error) {
            return key === 'waterLevel' ? false : '';
        }
    }

    _resolveActuator (type, selection) {
        return this._resolveMenuSelection(
            this.discovery.actuators.filter(item => item.type === type && item.enabled !== false),
            selection,
            'actuator'
        );
    }

    _resolveLighting (selection) {
        return this._resolveMenuSelection(this.discovery.lightings, selection, 'light') ||
            {index: 0, name: 'Light 1', type: 'light', enabled: true};
    }

    _resolveSensor (kind, selection) {
        return this._resolveMenuSelection(
            this.discovery.sensors.filter(item => this._sensorMatchesKind(item, kind) && item.enabled !== false),
            selection,
            'sensor'
        );
    }

    _resolveMenuSelection (items, selection, kind) {
        if (!items || !items.length) return null;
        const enabledItems = items.filter(item => item.enabled !== false);
        const fallback = enabledItems[0] || items[0];
        const token = parseToken(selection);
        if (token && token.kind === kind) {
            if (token.id) {
                const byId = items.find(item => String(item.id) === token.id);
                if (byId) return byId;
            }
            if (token.name) {
                const byName = items.find(item => item.name === token.name);
                if (byName) return byName;
            }
            if (Number.isFinite(token.index)) {
                const byIndex = items.find(item => Number(item.index) === token.index);
                if (byIndex) return byIndex;
            }
        }

        if (typeof selection === 'string' && selection.trim()) {
            const trimmed = selection.trim();
            const number = Number(trimmed);
            if (Number.isFinite(number)) {
                const byNumber = items.find(item => Number(item.index) === number);
                if (byNumber) return byNumber;
            }
            const byName = items.find(item => item.name === trimmed);
            if (byName) return byName;
        }

        return fallback;
    }

    getPreferredAddress () {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const storedIP = window.localStorage.getItem('albilab-default-ip');
                if (storedIP && normalizeAddress(storedIP)) {
                    return storedIP.trim();
                }
            }
        } catch (error) {
            // Ignore localStorage errors in embedded or backend VM contexts.
        }
        return DEFAULT_ADDRESS;
    }

    getValidatedIP (ipAddress) {
        if (!ipAddress || typeof ipAddress !== 'string') return null;
        const normalized = normalizeAddress(ipAddress.trim());
        if (normalized) return normalized;
        console.error(`[${new Date().toISOString()}] AlbiLAB: Invalid address format: ${ipAddress}`);
        return null;
    }
}

module.exports = Scratch3AlbiLABBlocks;
