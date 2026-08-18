const http = require('http');
const {spawn} = require('child_process');

const PORT = Number(process.env.PORT || 8088);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const width = Number(process.env.CAMERA_WIDTH || 1280);
const height = Number(process.env.CAMERA_HEIGHT || 720);
const timeoutMs = Number(process.env.CAMERA_TIMEOUT_MS || 10000);
let activeCapture = null;

const sendJson = (res, status, body) => {
    res.writeHead(status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(body));
};

const captureImage = () => new Promise((resolve, reject) => {
    const child = spawn('rpicam-still', [
        '--nopreview',
        '--timeout', '1',
        '--width', String(width),
        '--height', String(height),
        '--encoding', 'jpg',
        '--output', '-'
    ], {stdio: ['ignore', 'pipe', 'pipe']});
    const chunks = [];
    const errors = [];
    let size = 0;
    let timedOut = false;
    let imageTooLarge = false;
    const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES) {
            imageTooLarge = true;
            child.kill('SIGTERM');
            return;
        }
        chunks.push(chunk);
    });
    child.stderr.on('data', chunk => errors.push(chunk));
    child.once('error', reject);
    child.once('close', code => {
        clearTimeout(timer);
        if (timedOut) {
            reject(new Error(`rpicam-still did not finish within ${timeoutMs} ms`));
            return;
        }
        if (imageTooLarge) {
            reject(new Error(`rpicam-still returned more than ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`));
            return;
        }
        if (code !== 0) {
            reject(new Error(Buffer.concat(errors).toString('utf8').trim() || `rpicam-still exited with ${code}`));
            return;
        }
        const image = Buffer.concat(chunks);
        if (image.length === 0) {
            reject(new Error('rpicam-still did not return an image'));
            return;
        }
        resolve(image);
    });
});

http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
        sendJson(res, 200, {ok: true});
        return;
    }
    if (req.method !== 'POST' || req.url !== '/capture') {
        sendJson(res, 404, {error: 'Not found'});
        return;
    }
    if (activeCapture) {
        sendJson(res, 409, {error: 'A camera capture is already in progress'});
        return;
    }
    try {
        activeCapture = captureImage();
        const image = await activeCapture;
        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': image.length,
            'Cache-Control': 'no-store'
        });
        res.end(image);
    } catch (error) {
        console.error('Pi camera capture failed:', error.message);
        sendJson(res, 503, {error: error.message});
    } finally {
        activeCapture = null;
    }
}).listen(PORT, () => {
    console.log(`Pi camera service listening on ${PORT}`);
});
