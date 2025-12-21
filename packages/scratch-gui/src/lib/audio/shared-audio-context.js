import StartAudioContext from 'startaudiocontext';
import bowser from 'bowser';

let AUDIO_CONTEXT;
let isInitializing = false;

if (!bowser.msie) {
    /**
     * AudioContext can be initialized only when user interaction event happens
     */
    const initAudioContext = () => {
        if (isInitializing) return;
        isInitializing = true;
        
        document.removeEventListener('mousedown', initAudioContext);
        document.removeEventListener('touchstart', initAudioContext);
        document.removeEventListener('click', initAudioContext);
        
        if (AUDIO_CONTEXT) {
            // If context exists but is suspended, resume it
            if (AUDIO_CONTEXT.state === 'suspended') {
                AUDIO_CONTEXT.resume().catch(() => {
                    // Silently handle resume errors
                });
            }
            isInitializing = false;
            return;
        }

        try {
            AUDIO_CONTEXT = new (window.AudioContext ||
                window.webkitAudioContext)();
            StartAudioContext(AUDIO_CONTEXT).then(() => {
                isInitializing = false;
            }).catch(() => {
                isInitializing = false;
            });
        } catch (e) {
            console.warn('Failed to create AudioContext:', e);
            isInitializing = false;
        }
    };
    document.addEventListener('mousedown', initAudioContext);
    document.addEventListener('touchstart', initAudioContext);
    document.addEventListener('click', initAudioContext);
}

/**
 * Wrap browser AudioContext because we shouldn't create more than one
 * @returns {AudioContext} The singleton AudioContext
 */
export default function () {
    // If context exists but is suspended, try to resume it
    if (AUDIO_CONTEXT && AUDIO_CONTEXT.state === 'suspended') {
        AUDIO_CONTEXT.resume().catch(() => {
            // Silently handle resume errors
        });
    }
    return AUDIO_CONTEXT;
}
