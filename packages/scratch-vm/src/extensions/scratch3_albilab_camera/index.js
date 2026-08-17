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
        this._panelButtonCallbackKey = 'OPEN_PI_CAMERA_PANEL';
        this._panelRootId = 'albilabPiCameraPanel';
        this._panelFrameId = 'albilabPiCameraPanelFrame';
        this._panelStyleId = 'albilabPiCameraPanelStyle';
        this._buttonCallbackInstalled = false;
        this._buttonCallbackRetryTimer = null;
        this._buttonCallbackAttempts = 0;
        this._domButtonHookInstalled = false;
        this._refreshLastResult();
        this._refreshHealth();
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
                    return /Pi Camera panel/i.test(text);
                }
                node = node.parentNode;
            }
            return false;
        };
        const handler = event => {
            if (!matchesButton(event.target)) return;
            if (typeof event.preventDefault === 'function') event.preventDefault();
            if (typeof event.stopPropagation === 'function') event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
            window.setTimeout(() => this.openPanel(), 0);
        };
        document.addEventListener('click', handler, true);
        document.addEventListener('touchend', handler, true);
        this._domButtonHookInstalled = true;
    }

    _ensurePanelDom () {
        if (typeof document === 'undefined') return null;
        let styleEl = document.getElementById(this._panelStyleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = this._panelStyleId;
            styleEl.textContent = `
                #${this._panelRootId} {
                    position: fixed;
                    inset: 0;
                    z-index: 10000;
                    display: none;
                    align-items: stretch;
                    justify-content: flex-end;
                    background: rgba(22, 28, 45, 0.28);
                    backdrop-filter: blur(1px);
                }
                #${this._panelRootId}.open {
                    display: flex;
                }
                #${this._panelRootId} .pi-camera-sheet {
                    width: min(680px, calc(100vw - 24px));
                    height: min(820px, calc(100vh - 24px));
                    margin: 12px;
                    border-radius: 18px;
                    overflow: hidden;
                    border: 1px solid #d7dbe7;
                    background: #eef1f8;
                    box-shadow: 0 24px 48px rgba(63, 72, 96, 0.28);
                    display: flex;
                    flex-direction: column;
                }
                #${this._panelRootId} .pi-camera-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 12px 14px;
                    background: linear-gradient(135deg, #7D5FFF, #6B50E6);
                    color: white;
                    font: 600 16px/1.2 sans-serif;
                }
                #${this._panelRootId} .pi-camera-close {
                    border: 0;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.18);
                    color: white;
                    padding: 8px 12px;
                    cursor: pointer;
                    font: 600 13px/1 sans-serif;
                }
                #${this._panelRootId} .pi-camera-close:hover {
                    background: rgba(255,255,255,0.28);
                }
                #${this._panelFrameId} {
                    flex: 1;
                    width: 100%;
                    border: 0;
                    background: #eef1f8;
                }
            `;
            document.head.appendChild(styleEl);
        }

        let root = document.getElementById(this._panelRootId);
        if (!root) {
            root = document.createElement('div');
            root.id = this._panelRootId;
            root.innerHTML = `
                <div class="pi-camera-sheet" role="dialog" aria-modal="true" aria-label="Pi Kamera panel">
                    <div class="pi-camera-head">
                        <span>Pi Kamera</span>
                        <button type="button" class="pi-camera-close">Zavřít</button>
                    </div>
                    <iframe id="${this._panelFrameId}" title="Pi Kamera panel"></iframe>
                </div>
            `;
            root.addEventListener('click', event => {
                if (event.target === root) this.closePanel();
            });
            const closeBtn = root.querySelector('.pi-camera-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closePanel());
            }
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') this.closePanel();
            });
            document.body.appendChild(root);
        }
        return root;
    }

    openPanel () {
        this._ensureButtonCallbackInstalled();
        const root = this._ensurePanelDom();
        if (!root) return false;
        const frame = document.getElementById(this._panelFrameId);
        if (frame && !frame.getAttribute('src')) {
            frame.setAttribute('src', `${this._baseUrl()}/gallery-embed?ui=v6`);
        }
        root.classList.add('open');
        return true;
    }

    closePanel () {
        if (typeof document === 'undefined') return;
        const root = document.getElementById(this._panelRootId);
        if (root) root.classList.remove('open');
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
