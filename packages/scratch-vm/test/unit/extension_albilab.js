const test = require('tap').test;
const AlbiLAB = require('../../src/extensions/scratch3_albilab');
const AlbiLABAPIClient = require('../../src/extensions/scratch3_albilab/api-client');

const makeBlocks = () => {
    const blocks = new AlbiLAB({on: () => {}});
    blocks._startBackgroundRefresh = () => {};
    return blocks;
};

test('AlbiLAB API client builds firmware 2.0 POST bodies', async t => {
    const client = new AlbiLABAPIClient();
    const calls = [];
    client.postJson = async (endpoint, body, ipAddress) => {
        calls.push({endpoint, body, ipAddress});
        return {ok: true};
    };

    await client.controlActuator(2, 'start', 1500, null, '10.0.0.20');
    await client.controlActuator(3, 'set_power', null, 140, '10.0.0.20');
    await client.applyAutomationState({
        lightings: [{index: 0, mode: 'manual', manual_output: true}]
    }, '10.0.0.20', false);
    await client.applyLedRingsState({
        rings: [{pwm: {r: 10, b: 20, w: 30}}],
        automation: {
            _persist: false,
            lightings: [{index: 0, mode: 'manual', manual_output: true}]
        }
    }, '10.0.0.20');

    t.same(calls[0], {
        endpoint: '/api/actuators/control',
        body: {index: 2, action: 'start', duration_ms: 1500},
        ipAddress: '10.0.0.20'
    });
    t.same(calls[1].body, {index: 3, action: 'set_power', power: 100});
    t.equal(calls[2].endpoint, '/api/automation/apply');
    t.equal(calls[2].body._persist, false);
    t.equal(calls[3].endpoint, '/api/ledrings/apply');
    t.same(calls[3].body.automation, {
        _persist: false,
        lightings: [{index: 0, mode: 'manual', manual_output: true}]
    });
});

test('AlbiLAB API client keeps GET requests CORS-simple', async t => {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options) => {
        calls.push({url, options});
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Map(),
            json: async () => ({ok: true})
        };
    };
    t.teardown(() => {
        global.fetch = originalFetch;
    });

    const client = new AlbiLABAPIClient();
    await client.makeRequest('/api/sensors/values', {}, '10.0.0.20');
    await client.postJson('/api/actuators/control', {index: 0, action: 'start'}, '10.0.0.20');

    t.equal(calls[0].options.method, 'GET');
    t.same(calls[0].options.headers, {Accept: 'application/json'});
    t.notOk(calls[0].options.body);
    t.equal(calls[1].options.method, 'POST');
    t.equal(calls[1].options.headers['Content-Type'], 'application/json');
});

test('AlbiLAB API client proxies browser requests through scratch backend', async t => {
    const originalFetch = global.fetch;
    const originalWindow = global.window;
    global.window = {
        __RUNTIME_CONFIG__: {
            REACT_APP_API_BASE_URL: 'http://localhost:3001'
        },
        location: {
            protocol: 'http:',
            hostname: 'localhost'
        }
    };
    const calls = [];
    global.fetch = async (url, options) => {
        calls.push({url, options});
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: new Map(),
            json: async () => ({ok: true})
        };
    };
    t.teardown(() => {
        global.fetch = originalFetch;
        global.window = originalWindow;
    });

    const client = new AlbiLABAPIClient();
    await client.makeRequest('/api/sensors/values', {kind: 'all'}, '10.0.0.20');
    await client.postJson('/api/actuators/control', {index: 1, action: 'start'}, '10.0.0.20');

    t.equal(calls[0].url, 'http://localhost:3001/api/albilab/request');
    t.equal(calls[0].options.method, 'POST');
    const getPayload = JSON.parse(calls[0].options.body);
    t.same(getPayload, {
        address: 'http://10.0.0.20',
        endpoint: '/api/sensors/values',
        method: 'GET',
        params: {kind: 'all'},
        body: null
    });
    const postPayload = JSON.parse(calls[1].options.body);
    t.equal(postPayload.endpoint, '/api/actuators/control');
    t.equal(postPayload.body, '{"index":1,"action":"start"}');
});

test('AlbiLAB menus use discovered names and ignore disabled actuators', t => {
    const blocks = makeBlocks();
    blocks.discovery.actuators = [
        {id: 'pump-a', index: 0, type: 'waterPump', name: 'Main Pump', enabled: true},
        {id: 'pump-b', index: 1, type: 'waterPump', name: 'Disabled Pump', enabled: false},
        {id: 'fan-a', index: 2, type: 'fan', name: 'Cabinet Fan', enabled: true}
    ];
    blocks.discovery.sensors = [
        {
            id: 'climate-a',
            index: 0,
            typeKey: 'bme280',
            metaKey: 'bme280',
            classKey: 'temperature_humidity',
            name: 'Climate',
            enabled: true
        },
        {
            id: 'soil-a',
            index: 0,
            typeKey: 'soil_moisture',
            metaKey: 'soil_moisture',
            classKey: 'soil_moisture',
            name: 'Soil A',
            enabled: false
        }
    ];

    t.same(blocks.getPumpMenu(), [{
        text: 'Main Pump',
        value: 'actuator|waterPump|pump-a|0|Main%20Pump'
    }]);
    t.same(blocks.getFanMenu(), [{
        text: 'Cabinet Fan',
        value: 'actuator|fan|fan-a|2|Cabinet%20Fan'
    }]);
    t.same(blocks.getTemperatureSensorMenu(), [{
        text: 'Climate',
        value: 'sensor|temperature|climate-a|0|Climate'
    }]);
    t.same(blocks.getSoilSensorMenu(), [{
        text: 'Soil moisture 1',
        value: 'sensor|soil||0|Soil%20moisture%201'
    }]);

    const disabledSelection = 'actuator|waterPump|pump-b|1|Disabled%20Pump';
    t.equal(blocks._resolveActuator('waterPump', disabledSelection).id, 'pump-a');
    t.end();
});

test('AlbiLAB does not call legacy pump endpoint when firmware 2.0 actuator API is present', async t => {
    const blocks = makeBlocks();
    blocks.refreshDiscovery = async address => {
        blocks.discovery = Object.assign(blocks._emptyDiscovery(), {
            address,
            supportsActuatorsApi: true
        });
        return blocks.discovery;
    };
    blocks.apiClient.controlPump = async () => {
        t.fail('legacy pump endpoint should not be called');
    };

    await blocks.pumpOn({
        PUMP: '',
        ALBILAB: '10.0.0.42'
    });

    t.pass('missing firmware 2.0 pump does not fall back to /pump');
});

test('AlbiLAB keeps old opcodes while adding firmware 2.0 arguments', t => {
    const blocks = makeBlocks();
    const info = blocks.getInfo();
    const byOpcode = new Map(info.blocks.map(block => [block.opcode, block]));

    [
        'lightsOn',
        'lightsOff',
        'lightsCustom',
        'pumpOn',
        'pumpOff',
        'pumpOnFor',
        'pumpOffFor',
        'fanOn',
        'fanOff',
        'fanOnFor',
        'getTemperature',
        'getHumidity',
        'getSoilMoisture',
        'getWaterLevel'
    ].forEach(opcode => t.ok(byOpcode.has(opcode), `${opcode} exists`));

    t.ok(byOpcode.get('pumpOn').arguments.PUMP);
    t.ok(byOpcode.get('fanOn').arguments.FAN);
    t.ok(byOpcode.get('lightsOn').arguments.LIGHT);
    t.ok(byOpcode.get('getTemperature').arguments.SENSOR);
    t.ok(byOpcode.has('getCO2'));
    t.ok(byOpcode.has('getFlowRate'));
    t.ok(byOpcode.has('getTotalVolume'));
    t.ok(byOpcode.has('getPM25'));
    t.equal(info.menus.pumpMenu.acceptReporters, true);
    t.equal(info.menus.airQualitySensorMenu.acceptReporters, true);
    t.end();
});

test('AlbiLAB extracts firmware 2.0 sensor readings', async t => {
    const blocks = makeBlocks();
    blocks.discovery.sensors = [
        {
            id: 'climate-a',
            index: 0,
            typeKey: 'bme280',
            metaKey: 'bme280',
            classKey: 'temperature_humidity',
            name: 'Climate',
            enabled: true
        },
        {
            id: 'water-a',
            index: 0,
            typeKey: 'wls_mechanical',
            metaKey: 'water_level_switch',
            classKey: 'water_level',
            name: 'Tank WLS',
            enabled: true
        },
        {
            id: 'co2-a',
            index: 0,
            typeKey: 'scd41',
            metaKey: 'scd41',
            classKey: 'co2',
            name: 'CO2',
            enabled: true
        },
        {
            id: 'flow-a',
            index: 0,
            typeKey: 'flow_meter',
            metaKey: 'flow_meter',
            classKey: 'flow',
            name: 'Flow',
            enabled: true
        },
        {
            id: 'dust-a',
            index: 0,
            typeKey: 'sps30',
            metaKey: 'sps30',
            classKey: 'air_quality',
            name: 'Dust',
            enabled: true
        }
    ];
    blocks.refreshDiscovery = async () => blocks.discovery;
    blocks.apiClient.getSensorsValues = async () => ({
        bme280: [{name: 'Climate', enabled: true, temperature: 23.4, humidity: 51}],
        wls_mechanical: [{name: 'Tank WLS', enabled: true, wet: true}],
        scd41: [{name: 'CO2', enabled: true, co2: 812, temperature: 24.1, humidity: 49}],
        flow_meter: [{name: 'Flow', enabled: true, flow_lpm: 1.2, total_l: 3.4}],
        sps30: [{name: 'Dust', enabled: true, pm2_5: 7.8}]
    });

    const address = '10.0.0.42';
    t.equal(await blocks.getTemperature({
        SENSOR: 'sensor|temperature|climate-a|0|Climate',
        ALBILAB: address
    }), 23.4);
    t.equal(await blocks.getHumidity({
        SENSOR: 'sensor|humidity|climate-a|0|Climate',
        ALBILAB: address
    }), 51);
    t.equal(await blocks.getWaterLevel({
        SENSOR: 'sensor|water|water-a|0|Tank%20WLS',
        ALBILAB: address
    }), true);
    t.equal(await blocks.getCO2({
        SENSOR: 'sensor|co2|co2-a|0|CO2',
        ALBILAB: address
    }), 812);
    t.equal(await blocks.getFlowRate({
        SENSOR: 'sensor|flow|flow-a|0|Flow',
        ALBILAB: address
    }), 1.2);
    t.equal(await blocks.getTotalVolume({
        SENSOR: 'sensor|flow|flow-a|0|Flow',
        ALBILAB: address
    }), 3.4);
    t.equal(await blocks.getPM25({
        SENSOR: 'sensor|airQuality|dust-a|0|Dust',
        ALBILAB: address
    }), 7.8);
});

test('AlbiLAB applies firmware 2.0 lighting without persistence', async t => {
    const blocks = makeBlocks();
    blocks.discovery.lightings = [
        {index: 0, type: 'light', name: 'Channel 1', enabled: true},
        {index: 1, type: 'light', name: 'Channel 2', enabled: true}
    ];
    blocks.refreshDiscovery = async () => blocks.discovery;

    let automationCall = null;
    blocks.apiClient.getAutomationState = async () => ({
        lightings: [
            {index: 0, mode: 'auto', manual_output: false},
            {index: 1, mode: 'auto', manual_output: false}
        ]
    });
    blocks.apiClient.applyAutomationState = async (state, ipAddress, persist) => {
        automationCall = {state, ipAddress, persist};
        return {ok: true};
    };

    await blocks.lightsOn({
        LIGHT: 'light|light||1|Channel%202',
        ALBILAB: '10.0.0.42'
    });

    t.equal(automationCall.persist, false);
    t.equal(automationCall.state.lightings[1].mode, 'manual');
    t.equal(automationCall.state.lightings[1].manual_output, true);

    let ringsCall = null;
    blocks.apiClient.getLedRingsState = async () => ({
        rings: [
            {enabled: true, running: false, pwm: {r: 0, b: 0, w: 0}},
            {enabled: false, running: false, pwm: {r: 0, b: 0, w: 0}}
        ],
        show_no_rings_labels: true
    });
    blocks.apiClient.applyLedRingsState = async (state, ipAddress) => {
        ringsCall = {state, ipAddress};
        return {ok: true};
    };

    await blocks.lightsCustom({
        LIGHT: 'light|light||1|Channel%202',
        RED: 12,
        BLUE: 34,
        WHITE: 56,
        ALBILAB: '10.0.0.42'
    });

    t.same(ringsCall.state.rings[1].pwm, {r: 12, b: 34, w: 56});
    t.equal(ringsCall.state.rings[1].enabled, true);
    t.equal(ringsCall.state.rings[1].running, true);
    t.same(ringsCall.state.automation, {
        _persist: false,
        lightings: [{index: 1, mode: 'manual', manual_output: true}]
    });
});
