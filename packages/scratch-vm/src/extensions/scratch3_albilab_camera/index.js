const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const formatMessage = require('format-message');

const iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect x="3" y="8" width="34" height="24" rx="7" fill="#6B50E6"/><rect x="9" y="12" width="22" height="16" rx="5" fill="#8D78FF"/><circle cx="20" cy="20" r="6.5" fill="#FFFFFF"/><circle cx="20" cy="20" r="3.6" fill="#6B50E6"/><circle cx="30" cy="14" r="2.2" fill="#DCD4FF"/><path d="M12 8l3-4h10l3 4" fill="#A594FF"/><path d="M8 31c3-3 7-4 12-4s9 1 12 4" fill="none" stroke="#CFC6FF" stroke-width="2" stroke-linecap="round"/><path d="M31 7l.9 2.2L34 10l-2.1.8L31 13l-.9-2.2L28 10l2.1-.8z" fill="#FFF5A8"/></svg>';
const blockIconURI = `data:image/svg+xml;utf8,${encodeURIComponent(iconSvg)}`;

const csTranslations = {
    'albilabcamera.categoryName': 'Pi Kamera',
    'albilabcamera.captureAndAnalyze': 'vyfoť a zkontroluj květinu',
    'albilabcamera.cameraReady': 'kamera funguje?',
    'albilabcamera.flowerVisible': 'kvete?',
    'albilabcamera.isGrowing': 'roste?',
    'albilabcamera.flowerConfidence': 'procento vyhodnocení',
    'albilabcamera.lastLabel': 'výsledek rozpoznání',
    'albilabcamera.lastUpdatedAt': 'naposledy vyhodnoceno',
    'albilabcamera.captureReference': 'vyfoť vzor [LABEL]',
    'albilabcamera.matchReferences': 'porovnej s uloženými vzory',
    'albilabcamera.referenceProbability': 'pravděpodobnost [LABEL] %',
    'albilabcamera.bestMatchLabel': 'co kamera poznala?',
    'albilabcamera.openPanel': 'Pi Kamera panel'
};

const enTranslations = {
    'albilabcamera.categoryName': 'Pi Camera',
    'albilabcamera.captureAndAnalyze': 'capture and check flower',
    'albilabcamera.cameraReady': 'camera working?',
    'albilabcamera.flowerVisible': 'flower visible?',
    'albilabcamera.isGrowing': 'is growing?',
    'albilabcamera.flowerConfidence': 'evaluation percent',
    'albilabcamera.lastLabel': 'recognition result',
    'albilabcamera.lastUpdatedAt': 'last checked at',
    'albilabcamera.captureReference': 'capture sample [LABEL]',
    'albilabcamera.matchReferences': 'compare with saved samples',
    'albilabcamera.referenceProbability': 'probability [LABEL] %',
    'albilabcamera.bestMatchLabel': 'what did the camera recognize?',
    'albilabcamera.openPanel': 'Pi Camera panel'
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

class Scratch3AlbiLABCameraBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this._lastResult = null;
        this._lastHealth = null;
        this._lastError = '';
        this._lastFetchAt = 0;
        this._lastHealthAt = 0;
        this._cacheMs = 1200;
        this._lastResultPromise = null;
        this._lastHealthPromise = null;
        this._lastMatch = null;
        this._lastMatchAt = 0;
        this._lastMatchPromise = null;
        this._refreshLastResult();
        this._refreshHealth();
        this._refreshLastMatch();
    }

    getInfo () {
        installTranslations();
        return {
            id: 'albilabcamera',
            name: formatMessage({
                id: 'albilabcamera.categoryName',
                default: 'Pi Camera',
                description: 'Label for the Pi Camera extension category'
            }),
            color1: '#7D5FFF',
            color2: '#6B50E6',
            color3: '#5A43C2',
            blockIconURI,
            blocks: [
                {
                    opcode: 'captureAndAnalyze',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilabcamera.captureAndAnalyze',
                        default: 'capture and analyze flower',
                        description: 'Capture image and analyze flower'
                    })
                },
                {
                    opcode: 'cameraReady',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'albilabcamera.cameraReady',
                        default: 'camera is ready?',
                        description: 'Whether Pi camera backend is healthy'
                    })
                },
                {
                    opcode: 'flowerVisible',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'albilabcamera.flowerVisible',
                        default: 'flower visible?',
                        description: 'Whether flower is visible'
                    })
                },
                {
                    opcode: 'isGrowing',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'albilabcamera.isGrowing',
                        default: 'is growing?',
                        description: 'Whether plant appears to be growing'
                    })
                },
                {
                    opcode: 'flowerConfidence',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilabcamera.flowerConfidence',
                        default: 'evaluation percent',
                        description: 'How strongly the model thinks a flower is visible, in percent'
                    })
                },
                {
                    opcode: 'lastLabel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilabcamera.lastLabel',
                        default: 'last label',
                        description: 'Last flower classifier label'
                    })
                },
                {
                    opcode: 'lastUpdatedAt',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilabcamera.lastUpdatedAt',
                        default: 'last analyzed at',
                        description: 'Timestamp of last analysis'
                    })
                },
                '---',
                {
                    opcode: 'captureReference',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilabcamera.captureReference',
                        default: 'capture sample [LABEL]',
                        description: 'Capture one reference sample into a named set'
                    }),
                    arguments: {
                        LABEL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'micek'
                        }
                    }
                },
                {
                    opcode: 'matchReferences',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilabcamera.matchReferences',
                        default: 'compare with saved samples',
                        description: 'Capture current image and compare it with saved samples'
                    })
                },
                {
                    opcode: 'referenceProbability',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilabcamera.referenceProbability',
                        default: 'probability [LABEL] %',
                        description: 'Probability for a saved reference label'
                    }),
                    arguments: {
                        LABEL: {
                            type: ArgumentType.STRING,
                            defaultValue: 'micek'
                        }
                    }
                },
                {
                    opcode: 'bestMatchLabel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilabcamera.bestMatchLabel',
                        default: 'what did the camera recognize?',
                        description: 'Best matching saved reference label'
                    })
                },
                '---',
                {
                    func: 'OPEN_PI_CAMERA_PANEL',
                    blockType: BlockType.BUTTON,
                    text: formatMessage({
                        id: 'albilabcamera.openPanel',
                        default: 'Pi Camera panel',
                        description: 'Open the Pi Camera training and gallery panel'
                    })
                }
            ]
        };
    }

    _baseUrl () {
        const loc = (typeof window !== 'undefined' && window.location) ? window.location :
            ((typeof self !== 'undefined' && self.location) ? self.location : {protocol: 'http:', hostname: 'localhost'});
        const protocol = loc.protocol || 'http:';
        const hostname = loc.hostname || 'localhost';
        return `${protocol}//${hostname}:8088`;
    }

    async _fetchJson (path, options) {
        const response = await fetch(`${this._baseUrl()}${path}`, Object.assign({
            credentials: 'omit',
            cache: 'no-store'
        }, options || {}));
        const text = await response.text();
        let data = {};
        try {
            data = text ? JSON.parse(text) : {};
        } catch (err) {
            data = {ok: false, error: text || err.message || 'Invalid JSON'};
        }
        if (!response.ok || data.ok === false) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        return data;
    }

    _storeResultPayload (payload) {
        const result = payload && (payload.result || payload);
        if (result) {
            this._lastResult = result;
            this._lastFetchAt = Date.now();
            this._lastError = '';
        }
        return this._lastResult;
    }

    _refreshLastResult (force = false) {
        if (!force && this._lastResult && (Date.now() - this._lastFetchAt) < this._cacheMs) {
            return Promise.resolve(this._lastResult);
        }
        if (!force && this._lastResultPromise) {
            return this._lastResultPromise;
        }
        this._lastResultPromise = this._fetchJson('/api/last')
            .then(payload => this._storeResultPayload(payload))
            .catch(err => {
                this._lastError = err.message || String(err);
                return this._lastResult;
            })
            .finally(() => {
                this._lastResultPromise = null;
            });
        return this._lastResultPromise;
    }

    _refreshHealth (force = false) {
        if (!force && this._lastHealth && (Date.now() - this._lastHealthAt) < this._cacheMs) {
            return Promise.resolve(this._lastHealth);
        }
        if (!force && this._lastHealthPromise) {
            return this._lastHealthPromise;
        }
        this._lastHealthPromise = this._fetchJson('/health')
            .then(payload => {
                this._lastHealth = payload;
                this._lastHealthAt = Date.now();
                this._lastError = '';
                return payload;
            })
            .catch(err => {
                this._lastError = err.message || String(err);
                return this._lastHealth;
            })
            .finally(() => {
                this._lastHealthPromise = null;
            });
        return this._lastHealthPromise;
    }

    _refreshLastMatch (force = false) {
        if (!force && this._lastMatch && (Date.now() - this._lastMatchAt) < this._cacheMs) {
            return Promise.resolve(this._lastMatch);
        }
        if (!force && this._lastMatchPromise) {
            return this._lastMatchPromise;
        }
        this._lastMatchPromise = this._fetchJson('/api/references/last-match')
            .then(payload => {
                this._lastMatch = payload.result || payload;
                this._lastMatchAt = Date.now();
                return this._lastMatch;
            })
            .catch(() => this._lastMatch)
            .finally(() => {
                this._lastMatchPromise = null;
            });
        return this._lastMatchPromise;
    }

    _blocks () {
        return (this._lastResult && this._lastResult.blocks) ? this._lastResult.blocks : {};
    }

    async captureAndAnalyze () {
        try {
            const payload = await this._fetchJson('/analyze', {method: 'POST'});
            this._storeResultPayload(payload);
            return true;
        } catch (err) {
            this._lastError = err.message || String(err);
            return false;
        }
    }

    async captureReference (args) {
        try {
            await this._fetchJson('/api/references/capture', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({label: String(args.LABEL || '').trim()})
            });
            return true;
        } catch (err) {
            this._lastError = err.message || String(err);
            return false;
        }
    }

    async matchReferences () {
        try {
            const payload = await this._fetchJson('/api/references/match', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({capture: true})
            });
            this._lastMatch = payload;
            this._lastMatchAt = Date.now();
            return true;
        } catch (err) {
            this._lastError = err.message || String(err);
            return false;
        }
    }

    cameraReady () {
        this._refreshHealth();
        return !!(this._lastHealth && this._lastHealth.ok);
    }

    flowerVisible () {
        this._refreshLastResult();
        return !!Number(this._blocks().kvete || 0);
    }

    isGrowing () {
        this._refreshLastResult();
        return !!Number(this._blocks().roste || 0);
    }

    flowerConfidence () {
        this._refreshLastResult();
        const value = Number(this._blocks().flower_confidence || 0);
        if (!Number.isFinite(value)) return 0;
        return Math.round(value);
    }

    lastLabel () {
        this._refreshLastResult();
        const raw = String(this._blocks().last_label || '');
        const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.toLowerCase() : 'en';
        const cs = locale.startsWith('cs');
        if (raw === 'flower_visible') return cs ? 'květ' : 'flower';
        if (raw === 'no_flower') return cs ? 'bez květu' : 'no flower';
        if (raw === 'unknown') return cs ? 'neznámé' : 'unknown';
        return raw;
    }

    lastUpdatedAt () {
        this._refreshLastResult();
        const raw = this._blocks().updated_at;
        const num = Number(raw || 0);
        if (!Number.isFinite(num) || num <= 0) return '';
        const ms = num > 1e12 ? num : num * 1000;
        const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'cs-CZ';
        try {
            return new Date(ms).toLocaleString(locale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch (e) {
            return new Date(ms).toISOString();
        }
    }

    referenceProbability (args) {
        this._refreshLastMatch();
        const label = String(args.LABEL || '').trim();
        if (!label || !this._lastMatch || !this._lastMatch.labels) return 0;
        const hit = this._lastMatch.labels[label];
        if (!hit) return 0;
        const value = Number(hit.probability || 0);
        return Number.isFinite(value) ? Math.round(value) : 0;
    }

    bestMatchLabel () {
        this._refreshLastMatch();
        return (this._lastMatch && this._lastMatch.bestLabel) ? String(this._lastMatch.bestLabel) : '';
    }
}

module.exports = Scratch3AlbiLABCameraBlocks;
