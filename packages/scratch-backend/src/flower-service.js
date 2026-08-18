const http = require('http');
const https = require('https');

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15000;

const requestBuffer = (url, options = {}) => new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === 'https:' ? https : http;
    const request = transport.request({
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: target.pathname + target.search,
        method: options.method || 'GET',
        headers: options.headers || {}
    }, response => {
        const chunks = [];
        let size = 0;
        response.on('data', chunk => {
            size += chunk.length;
            if (size > MAX_IMAGE_BYTES) {
                request.destroy(new Error('Response exceeds 10 MB'));
                return;
            }
            chunks.push(chunk);
        });
        response.once('end', () => {
            const body = Buffer.concat(chunks);
            if (response.statusCode < 200 || response.statusCode >= 300) {
                reject(new Error(body.toString('utf8').trim() || `HTTP ${response.statusCode}`));
                return;
            }
            resolve({body, headers: response.headers});
        });
    });
    request.once('error', reject);
    request.setTimeout(options.timeoutMs || REQUEST_TIMEOUT_MS, () => {
        request.destroy(new Error(`Request timed out after ${options.timeoutMs || REQUEST_TIMEOUT_MS} ms`));
    });
    if (options.body) request.write(options.body);
    request.end();
});

const captureFromPiCamera = cameraBaseUrl => {
    const captureUrl = new URL('/capture', cameraBaseUrl);
    return requestBuffer(captureUrl, {method: 'POST'}).then(({body, headers}) => {
        if (!String(headers['content-type'] || '').startsWith('image/jpeg')) {
            throw new Error('Pi camera did not return a JPEG image');
        }
        return body;
    });
};

const predictFlower = (apiBaseUrl, image) => {
    const boundary = `----scratchFlower${Date.now().toString(16)}`;
    const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="capture.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`);
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([prefix, image, suffix]);
    const predictUrl = new URL('/v1/predict', apiBaseUrl);
    return requestBuffer(predictUrl, {
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length
        },
        body
    }).then(({body: responseBody}) => {
        let payload;
        try {
            payload = JSON.parse(responseBody.toString('utf8'));
        } catch (error) {
            throw new Error('Flower service returned invalid JSON');
        }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new Error('Flower service returned an invalid response');
        }
        return payload;
    });
};

const asPercent = value => {
    const number = Number(value || 0);
    return Number.isFinite(number) ? Math.round(number * 100) : 0;
};

const toScratchResult = payload => ({
    blocks: {
        kvete: payload.flower_presence === 'flower_visible' ? 1 : 0,
        roste: payload.flower_presence === 'no_flower' ? 1 : 0,
        flower_confidence: asPercent(payload.confidence),
        last_label: payload.flower_presence || 'unknown',
        updated_at: Math.floor(Date.now() / 1000)
    },
    result: payload
});

const captureAndAnalyzeFlower = async ({cameraBaseUrl, flowerApiBaseUrl}) => {
    if (!flowerApiBaseUrl) {
        throw new Error('Flower API base URL is not configured');
    }
    const image = await captureFromPiCamera(cameraBaseUrl);
    const prediction = await predictFlower(flowerApiBaseUrl, image);
    return {
        image,
        result: toScratchResult(prediction)
    };
};

module.exports = {
    captureAndAnalyzeFlower,
    toScratchResult
};
