const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');

const iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect x="3" y="8" width="34" height="24" rx="7" fill="#43B581"/><rect x="9" y="12" width="22" height="16" rx="5" fill="#6DDBA6"/><circle cx="20" cy="20" r="6.5" fill="#FFFFFF"/><circle cx="20" cy="20" r="3.6" fill="#43B581"/><circle cx="30" cy="14" r="2.2" fill="#D7F8E7"/><path d="M12 8l3-4h10l3 4" fill="#8CE2B8"/><path d="M8 31c3-3 7-4 12-4s9 1 12 4" fill="none" stroke="#C7F2DB" stroke-width="2" stroke-linecap="round"/><path d="M31 7l.9 2.2L34 10l-2.1.8L31 13l-.9-2.2L28 10l2.1-.8z" fill="#FFF5A8"/></svg>';
const blockIconURI = `data:image/svg+xml;utf8,${encodeURIComponent(iconSvg)}`;

const csTranslations = {
    'albilabflower.categoryName': 'Pi Květina',
    'albilabflower.captureAndAnalyze': 'vyfoť a zkontroluj květinu',
    'albilabflower.flowerVisible': 'kvete?',
    'albilabflower.isGrowing': 'roste?',
    'albilabflower.flowerConfidence': 'procento vyhodnocení',
    'albilabflower.lastLabel': 'výsledek rozpoznání',
    'albilabflower.lastUpdatedAt': 'naposledy vyhodnoceno'
};

const enTranslations = {
    'albilabflower.categoryName': 'Pi Flower',
    'albilabflower.captureAndAnalyze': 'capture and check flower',
    'albilabflower.flowerVisible': 'flower visible?',
    'albilabflower.isGrowing': 'is growing?',
    'albilabflower.flowerConfidence': 'evaluation percent',
    'albilabflower.lastLabel': 'recognition result',
    'albilabflower.lastUpdatedAt': 'last checked at'
};

const installTranslations = () => {
    const currentSetup = formatMessage.setup() || {};
    const translations = Object.assign({}, currentSetup.translations || {});
    translations.cs = Object.assign({}, translations.cs || {}, csTranslations);
    translations['cs-cz'] = Object.assign({}, translations['cs-cz'] || {}, csTranslations);
    translations.en = Object.assign({}, translations.en || {}, enTranslations);
    translations['en-us'] = Object.assign({}, translations['en-us'] || {}, enTranslations);
    translations['en-gb'] = Object.assign({}, translations['en-gb'] || {}, enTranslations);
    formatMessage.setup(Object.assign({}, currentSetup, {
        locale: currentSetup.locale || 'en',
        translations
    }));
};

installTranslations();

class Scratch3AlbiLABFlowerBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this._lastResult = null;
        this._lastError = '';
        this._lastFetchAt = 0;
        this._cacheMs = 1200;
        this._lastResultPromise = null;
        this._refreshLastResult();
    }

    getInfo () {
        installTranslations();
        return {
            id: 'albilabflower',
            name: formatMessage({
                id: 'albilabflower.categoryName',
                default: 'Pi Flower',
                description: 'Label for the Pi Flower extension category'
            }),
            color1: '#4CCB8A',
            color2: '#43B581',
            color3: '#379B6C',
            blockIconURI,
            blocks: [
                {
                    opcode: 'captureAndAnalyze',
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: 'albilabflower.captureAndAnalyze',
                        default: 'capture and check flower',
                        description: 'Capture image and analyze flower'
                    })
                },
                {
                    opcode: 'flowerVisible',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'albilabflower.flowerVisible',
                        default: 'flower visible?',
                        description: 'Whether flower is visible'
                    })
                },
                {
                    opcode: 'isGrowing',
                    blockType: BlockType.BOOLEAN,
                    text: formatMessage({
                        id: 'albilabflower.isGrowing',
                        default: 'is growing?',
                        description: 'Whether plant appears to be growing'
                    })
                },
                {
                    opcode: 'flowerConfidence',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilabflower.flowerConfidence',
                        default: 'evaluation percent',
                        description: 'How strongly the model thinks a flower is visible, in percent'
                    })
                },
                {
                    opcode: 'lastLabel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilabflower.lastLabel',
                        default: 'recognition result',
                        description: 'Last flower classifier label'
                    })
                },
                {
                    opcode: 'lastUpdatedAt',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'albilabflower.lastUpdatedAt',
                        default: 'last checked at',
                        description: 'Timestamp of last analysis'
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

    _blocks () {
        return (this._lastResult && this._lastResult.blocks) ? this._lastResult.blocks : {};
    }

    async captureAndAnalyze () {
        try {
            const payload = await this._fetchJson('/analyze', {method: 'POST'});
            this._storeResultPayload(payload);
        } catch (err) {
            this._lastError = err.message || String(err);
        }
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
}

module.exports = Scratch3AlbiLABFlowerBlocks;
