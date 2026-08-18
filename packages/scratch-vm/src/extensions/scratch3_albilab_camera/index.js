const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const formatMessage = require('format-message');

const iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect x="3" y="8" width="34" height="24" rx="7" fill="#6B50E6"/><rect x="9" y="12" width="22" height="16" rx="5" fill="#8D78FF"/><circle cx="20" cy="20" r="6.5" fill="#FFFFFF"/><circle cx="20" cy="20" r="3.6" fill="#6B50E6"/><circle cx="30" cy="14" r="2.2" fill="#DCD4FF"/><path d="M12 8l3-4h10l3 4" fill="#A594FF"/><path d="M8 31c3-3 7-4 12-4s9 1 12 4" fill="none" stroke="#CFC6FF" stroke-width="2" stroke-linecap="round"/><path d="M31 7l.9 2.2L34 10l-2.1.8L31 13l-.9-2.2L28 10l2.1-.8z" fill="#FFF5A8"/></svg>';
const blockIconURI = `data:image/svg+xml;utf8,${encodeURIComponent(iconSvg)}`;

const csTranslations = {
    'albilabcamera.categoryName': 'Pi Rozpoznávání',
    'albilabcamera.captureReference': 'vyfoť vzor [LABEL]',
    'albilabcamera.matchReferences': 'porovnej s uloženými vzory',
    'albilabcamera.referenceProbability': 'pravděpodobnost [LABEL] %',
    'albilabcamera.bestMatchLabel': 'co kamera poznala?',
    'albilabcamera.openPanel': 'Pi Kamera panel'
};

const enTranslations = {
    'albilabcamera.categoryName': 'Pi Recognition',
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

const isPanelButtonLabel = text => /Pi (Camera|Kamera) panel/i.test(String(text || '').trim());

class Scratch3AlbiLABCameraBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this._lastError = '';
        this._lastMatch = null;
        this._lastMatchAt = 0;
        this._cacheMs = 1200;
        this._lastMatchPromise = null;
        this._lastFlowerResult = null;
        this._lastFlowerAt = 0;
        this._lastFlowerPromise = null;
        this._panelButtonCallbackKey = 'OPEN_PI_CAMERA_PANEL';
        this._buttonCallbackInstalled = false;
        this._buttonCallbackRetryTimer = null;
        this._buttonCallbackAttempts = 0;
        this._domButtonHookInstalled = false;
        this._boundFlyoutTargets = [];
        this._refreshLastMatch();
        this._ensureButtonCallbackInstalled();
        this._ensurePanelButtonDomHook();
    }

    getInfo () {
        installTranslations();
        this._ensureButtonCallbackInstalled();
        this._ensurePanelButtonDomHook();
        return {
            id: 'albilabcamera',
            name: formatMessage({
                id: 'albilabcamera.categoryName',
                default: 'Pi Recognition',
                description: 'Label for the Pi Recognition extension category'
            }),
            color1: '#7D5FFF',
            color2: '#6B50E6',
            color3: '#5A43C2',
            blockIconURI,
            blocks: [
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
                {
                    opcode: 'cameraReady',
                    blockType: BlockType.BOOLEAN,
                    text: 'kamera funguje?',
                    hideFromPalette: true
                },
                {
                    opcode: 'captureAndAnalyze',
                    blockType: BlockType.COMMAND,
                    text: 'vyfoť a zkontroluj květinu',
                    hideFromPalette: true
                },
                {
                    opcode: 'flowerVisible',
                    blockType: BlockType.BOOLEAN,
                    text: 'kvete?',
                    hideFromPalette: true
                },
                {
                    opcode: 'isGrowing',
                    blockType: BlockType.BOOLEAN,
                    text: 'roste?',
                    hideFromPalette: true
                },
                {
                    opcode: 'flowerConfidence',
                    blockType: BlockType.REPORTER,
                    text: 'procento vyhodnocení',
                    hideFromPalette: true
                },
                {
                    opcode: 'lastLabel',
                    blockType: BlockType.REPORTER,
                    text: 'výsledek rozpoznání',
                    hideFromPalette: true
                },
                {
                    opcode: 'lastUpdatedAt',
                    blockType: BlockType.REPORTER,
                    text: 'naposledy vyhodnoceno',
                    hideFromPalette: true
                },
                {
                    opcode: 'lastError',
                    blockType: BlockType.REPORTER,
                    text: 'poslední chyba kamery',
                    hideFromPalette: true
                },
                '---',
                {
                    func: this._panelButtonCallbackKey,
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

    _ensureButtonCallbackInstalled () {
        if (typeof window === 'undefined') return;
        if (this._buttonCallbackInstalled) return;
        const install = () => {
            const scratchBlocks = window.ScratchBlocks || window.Blockly;
            const workspace = scratchBlocks && typeof scratchBlocks.getMainWorkspace === 'function' ?
                scratchBlocks.getMainWorkspace() : null;
            const flyoutWorkspace = workspace && workspace.getFlyout && workspace.getFlyout() && workspace.getFlyout().getWorkspace ?
                workspace.getFlyout().getWorkspace() : null;
            const callback = () => this.openPanel();
            let installed = false;
            [workspace, flyoutWorkspace].forEach(candidate => {
                if (candidate && typeof candidate.registerButtonCallback === 'function') {
                    candidate.registerButtonCallback(this._panelButtonCallbackKey, callback);
                    installed = true;
                }
            });
            if (installed) {
                this._buttonCallbackInstalled = true;
                this._buttonCallbackRetryTimer = null;
                return;
            }
            this._buttonCallbackAttempts += 1;
            if (this._buttonCallbackAttempts < 40) {
                this._buttonCallbackRetryTimer = window.setTimeout(install, 500);
            }
        };
        install();
    }

    _ensurePanelButtonDomHook () {
        if (typeof document === 'undefined' || this._domButtonHookInstalled) return;
        const matchesButton = target => {
            let node = target;
            while (node) {
                const className = typeof node.className === 'string' ? node.className :
                    (node.className && node.className.baseVal) || '';
                if (className && className.indexOf('blocklyFlyoutButton') >= 0) {
                    const text = (node.textContent || '').trim();
                    if (isPanelButtonLabel(text)) {
                        return true;
                    }
                }
                node = node.parentNode;
            }
            return false;
        };
        const isPointInsidePanelButton = event => {
            const getPoint = () => {
                if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
                    return {x: event.clientX, y: event.clientY};
                }
                const touch = event.changedTouches && event.changedTouches[0];
                if (touch && typeof touch.clientX === 'number' && typeof touch.clientY === 'number') {
                    return {x: touch.clientX, y: touch.clientY};
                }
                return null;
            };
            const point = getPoint();
            if (!point) return false;
            const buttons = Array.prototype.slice.call(document.querySelectorAll('g.blocklyFlyoutButton'));
            return buttons.some(node => {
                const text = (node.textContent || '').trim();
                if (!isPanelButtonLabel(text)) return false;
                if (typeof node.getBoundingClientRect !== 'function') return false;
                const rect = node.getBoundingClientRect();
                return point.x >= rect.left && point.x <= rect.right &&
                    point.y >= rect.top && point.y <= rect.bottom;
            });
        };
        const openFromEvent = event => {
            if (!matchesButton(event.target) && !isPointInsidePanelButton(event)) return;
            if (typeof event.preventDefault === 'function') event.preventDefault();
            if (typeof event.stopPropagation === 'function') event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
            window.setTimeout(() => this.openPanel(), 0);
        };
        const bindDirectTargets = () => {
            const directTargets = Array.prototype.slice.call(document.querySelectorAll('g.blocklyFlyoutButton, g.blocklyFlyoutButton *'));
            directTargets.forEach(node => {
                if (!node || node.__piCameraPanelBound) return;
                if (!matchesButton(node)) return;
                ['pointerdown', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click'].forEach(type => {
                    node.addEventListener(type, openFromEvent, true);
                });
                node.__piCameraPanelBound = true;
                this._boundFlyoutTargets.push(node);
            });
        };
        ['pointerdown', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click'].forEach(type => {
            document.addEventListener(type, openFromEvent, true);
        });
        bindDirectTargets();
        if (typeof MutationObserver !== 'undefined' && document.body) {
            const observer = new MutationObserver(() => bindDirectTargets());
            observer.observe(document.body, {childList: true, subtree: true});
        }
        this._domButtonHookInstalled = true;
    }

    openPanel () {
        if (typeof window === 'undefined') return;
        this._ensureButtonCallbackInstalled();
        try {
            window.dispatchEvent(new CustomEvent('open-pi-camera-modal-request'));
        } catch (error) {
            this._lastError = error.message || String(error);
        }
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

    _storeFlowerPayload (payload) {
        const result = payload && (payload.result || payload);
        if (result) {
            this._lastFlowerResult = result;
            this._lastFlowerAt = Date.now();
            this._lastError = '';
        }
        return this._lastFlowerResult;
    }

    _refreshLastFlowerResult (force = false) {
        if (!force && this._lastFlowerResult && (Date.now() - this._lastFlowerAt) < this._cacheMs) {
            return Promise.resolve(this._lastFlowerResult);
        }
        if (!force && this._lastFlowerPromise) {
            return this._lastFlowerPromise;
        }
        this._lastFlowerPromise = this._fetchJson('/api/last')
            .then(payload => this._storeFlowerPayload(payload))
            .catch(err => {
                this._lastError = err.message || String(err);
                return this._lastFlowerResult;
            })
            .finally(() => {
                this._lastFlowerPromise = null;
            });
        return this._lastFlowerPromise;
    }

    _flowerBlocks () {
        return (this._lastFlowerResult && this._lastFlowerResult.blocks) ? this._lastFlowerResult.blocks : {};
    }

    async captureReference (args) {
        try {
            await this._fetchJson('/api/references/capture', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({label: String(args.LABEL || '').trim()})
            });
        } catch (err) {
            this._lastError = err.message || String(err);
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
        } catch (err) {
            this._lastError = err.message || String(err);
        }
    }

    async cameraReady () {
        try {
            const response = await fetch(`${this._baseUrl()}/health`, {
                credentials: 'omit',
                cache: 'no-store'
            });
            if (!response.ok) {
                this._lastError = `HTTP ${response.status}`;
                return false;
            }
            this._lastError = '';
            return true;
        } catch (err) {
            this._lastError = err.message || String(err);
            return false;
        }
    }

    async captureAndAnalyze () {
        try {
            const payload = await this._fetchJson('/analyze', {method: 'POST'});
            this._storeFlowerPayload(payload);
        } catch (err) {
            this._lastError = err.message || String(err);
        }
    }

    flowerVisible () {
        this._refreshLastFlowerResult();
        return !!Number(this._flowerBlocks().kvete || 0);
    }

    isGrowing () {
        this._refreshLastFlowerResult();
        return !!Number(this._flowerBlocks().roste || 0);
    }

    flowerConfidence () {
        this._refreshLastFlowerResult();
        const value = Number(this._flowerBlocks().flower_confidence || 0);
        if (!Number.isFinite(value)) return 0;
        return Math.round(value);
    }

    lastLabel () {
        this._refreshLastFlowerResult();
        const raw = String(this._flowerBlocks().last_label || '');
        const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language.toLowerCase() : 'en';
        const cs = locale.startsWith('cs');
        if (raw === 'flower_visible') return cs ? 'květ' : 'flower';
        if (raw === 'no_flower') return cs ? 'bez květu' : 'no flower';
        if (raw === 'unknown') return cs ? 'neznámé' : 'unknown';
        return raw;
    }

    lastUpdatedAt () {
        this._refreshLastFlowerResult();
        const raw = this._flowerBlocks().updated_at;
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

    lastError () {
        return this._lastError || '';
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
