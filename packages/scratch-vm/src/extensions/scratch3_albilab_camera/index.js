const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');

const iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect x="3" y="8" width="34" height="24" rx="7" fill="#6B50E6"/><rect x="9" y="12" width="22" height="16" rx="5" fill="#8D78FF"/><circle cx="20" cy="20" r="6.5" fill="#FFFFFF"/><circle cx="20" cy="20" r="3.6" fill="#6B50E6"/><circle cx="30" cy="14" r="2.2" fill="#DCD4FF"/><path d="M12 8l3-4h10l3 4" fill="#A594FF"/><path d="M8 31c3-3 7-4 12-4s9 1 12 4" fill="none" stroke="#CFC6FF" stroke-width="2" stroke-linecap="round"/><path d="M31 7l.9 2.2L34 10l-2.1.8L31 13l-.9-2.2L28 10l2.1-.8z" fill="#FFF5A8"/></svg>';
const blockIconURI = `data:image/svg+xml;utf8,${encodeURIComponent(iconSvg)}`;

const csTranslations = {
    'albilabcamera.categoryName': 'Pi Kamera',
    'albilabcamera.openPanel': 'Pi Kamera panel'
};

const enTranslations = {
    'albilabcamera.categoryName': 'Pi Camera',
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
        this._panelButtonCallbackKey = 'OPEN_PI_CAMERA_PANEL';
        this._buttonCallbackInstalled = false;
        this._buttonCallbackRetryTimer = null;
        this._buttonCallbackAttempts = 0;
        this._domButtonHookInstalled = false;
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
            blocks: [{
                func: this._panelButtonCallbackKey,
                blockType: BlockType.BUTTON,
                text: formatMessage({
                    id: 'albilabcamera.openPanel',
                    default: 'Pi Camera panel',
                    description: 'Open the Pi Camera panel'
                })
            }]
        };
    }

    _ensureButtonCallbackInstalled () {
        if (typeof window === 'undefined' || this._buttonCallbackInstalled) return;
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
                if (className && className.indexOf('blocklyFlyoutButton') >= 0 && isPanelButtonLabel(node.textContent)) {
                    return true;
                }
                node = node.parentNode;
            }
            return false;
        };
        const openFromEvent = event => {
            if (!matchesButton(event.target)) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            window.setTimeout(() => this.openPanel(), 0);
        };
        ['pointerdown', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click'].forEach(type => {
            document.addEventListener(type, openFromEvent, true);
        });
        this._domButtonHookInstalled = true;
    }

    openPanel () {
        if (typeof window === 'undefined') return;
        this._ensureButtonCallbackInstalled();
        window.dispatchEvent(new CustomEvent('open-pi-camera-modal-request'));
    }
}

module.exports = Scratch3AlbiLABCameraBlocks;
