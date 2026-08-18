const test = require('tap').test;
const PiFlower = require('../../src/extensions/scratch3_albilab_flower');

test('Pi Flower uses its same-origin API outside development', t => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalWindow = global.window;
    delete process.env.NODE_ENV;
    global.window = {
        location: {
            protocol: 'https:',
            hostname: 'scratch.example'
        }
    };

    t.teardown(() => {
        if (originalNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalNodeEnv;
        }
        global.window = originalWindow;
    });

    t.equal(PiFlower.prototype._baseUrl(), '/api/flower');
});

test('Pi Flower uses the backend service during development', t => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalWindow = global.window;
    process.env.NODE_ENV = 'development';
    global.window = {
        location: {
            protocol: 'http:',
            hostname: 'localhost'
        }
    };

    t.teardown(() => {
        if (originalNodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = originalNodeEnv;
        }
        global.window = originalWindow;
    });

    t.equal(PiFlower.prototype._baseUrl(), 'http://localhost:3001/api/flower');
});
