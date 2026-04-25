/**
 * Main entry point — Too Deep interactive artwork
 */
import * as THREE from 'three';
import { createScene } from './scene.js';
import { createPostProcessing } from './postprocessing.js';
import { AudioEngine } from './audioEngine.js';

// ================================================================
// PLATFORM LINKS
// ================================================================
const PLATFORM_LINKS = [
    { slug: 'spotify', label: 'Spotify', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/spotify' },
    { slug: 'applemusic', label: 'Apple Music', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/applemusic' },
    { slug: 'deezer', label: 'Deezer', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/deezer' },
    { slug: 'amazonmusic', label: 'Amazon Music', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/amazonmusic' },
    { slug: 'tidal', label: 'TIDAL', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/tidal' },
    { slug: 'soundcloud', label: 'SoundCloud', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/soundcloud' },
    { slug: 'audiomack', label: 'Audiomack', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/audiomack' },
];

// Simple monochrome brand SVG glyphs (14x14, stroke/fill in currentColor)
const BRAND_ICONS = {
    spotify: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.3-.6.4-1 .2-2.7-1.6-6-2-10-1.1-.4.1-.8-.2-.8-.6-.1-.4.2-.8.6-.8 4.3-1 8-0.6 11 1.2.3.2.4.7.2 1.1zm1.5-3.3c-.3.4-.8.5-1.2.3-3.1-1.9-7.7-2.4-11.3-1.3-.5.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 4.1-1.3 9.2-.7 12.7 1.5.4.2.5.8.3 1.2zm.1-3.4c-3.7-2.2-9.8-2.4-13.3-1.3-.5.2-1.1-.1-1.3-.6-.2-.5.1-1.1.6-1.3 4-1.2 10.7-1 14.9 1.5.5.3.6.9.4 1.4-.3.5-.9.6-1.3.3z"/></svg>',
    applemusic: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.802.42.127.856.187 1.293.228.555.053 1.11.063 1.667.063q5.497.002 10.995 0c.36 0 .72-.01 1.078-.04.474-.04.943-.1 1.399-.24 1.498-.46 2.593-1.398 3.242-2.83.193-.428.298-.876.363-1.336.082-.6.102-1.203.1-1.807V6.124zm-6.71 3.592v7.688c0 .543-.088 1.07-.377 1.54-.355.58-.867.87-1.528.96-.322.044-.648.047-.967-.008-.793-.14-1.357-.678-1.491-1.476-.09-.54.012-1.04.382-1.46.276-.312.627-.505 1.02-.624.278-.085.564-.136.85-.194.246-.05.494-.094.73-.17.295-.095.465-.293.507-.602.008-.054.013-.11.013-.163V10.88c0-.203-.04-.39-.22-.52a.674.674 0 00-.462-.129c-.18.016-.354.058-.525.1l-4.762 1.14c-.022.006-.043.015-.065.02-.336.1-.465.26-.486.608-.004.06-.002.12-.002.18v8.645c0 .13-.004.26-.02.39-.055.45-.171.876-.49 1.227-.366.402-.833.6-1.368.658-.39.043-.78.033-1.163-.082-.57-.17-.965-.518-1.148-1.093-.096-.3-.12-.614-.078-.928.098-.716.577-1.242 1.272-1.438.3-.085.608-.14.916-.2.26-.052.52-.103.77-.19.295-.1.456-.296.504-.602.012-.073.017-.148.017-.222V7.34c0-.217.015-.434.07-.645.072-.274.21-.476.47-.588.098-.042.2-.074.302-.1L18.68 5a8.39 8.39 0 01.534-.118.666.666 0 01.657.263c.092.14.122.3.122.468-.003.173 0 .345 0 .518v3.585z"/></svg>',
    deezer: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="0" y="18" width="4" height="2" rx=".5"/><rect x="6" y="18" width="4" height="2" rx=".5"/><rect x="6" y="15" width="4" height="2" rx=".5"/><rect x="12" y="18" width="4" height="2" rx=".5"/><rect x="12" y="15" width="4" height="2" rx=".5"/><rect x="12" y="12" width="4" height="2" rx=".5"/><rect x="18" y="18" width="4" height="2" rx=".5"/><rect x="18" y="15" width="4" height="2" rx=".5"/><rect x="18" y="12" width="4" height="2" rx=".5"/><rect x="18" y="9" width="4" height="2" rx=".5"/><rect x="18" y="6" width="4" height="2" rx=".5"/></svg>',
    amazonmusic: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.65 18.58c-.27-.14-2.76-1.33-3.24-1.47-.48-.15-.72 0-.98.21-.33.26-1.35 1.2-1.65 1.44-.3.24-.6.24-.88.09-1.91-.97-3.3-2.17-4.43-3.86a9.46 9.46 0 01-1.5-4.04c-.05-.39.1-.6.38-.8.26-.2.55-.48.81-.72.26-.24.34-.44.52-.72.17-.28.08-.54-.04-.76-.13-.22-1.18-2.83-1.63-3.86-.41-.96-.86-.82-1.18-.82-.3 0-.65-.04-.99-.04-.34 0-.9.13-1.38.63-.48.5-1.82 1.77-1.82 4.33 0 2.56 1.86 5.03 2.12 5.37.26.35 3.6 5.76 8.93 7.84 1.24.49 2.21.78 2.97.99 1.25.35 2.39.3 3.29.18.99-.14 3.09-1.26 3.52-2.49.43-1.22.43-2.27.3-2.49z"/></svg>',
    tidal: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l4 4-4 4-4-4 4-4zm-8 4l4 4-4 4-4-4 4-4zm16 0l4 4-4 4-4-4 4-4zm-8 8l4 4-4 4-4-4 4-4z"/></svg>',
    soundcloud: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.175 13.87a.147.147 0 00-.147.135l-.33 2.46.33 2.413a.147.147 0 00.293 0l.375-2.413-.376-2.46a.147.147 0 00-.145-.135zm1.81-1.06a.183.183 0 00-.183.166l-.313 3.49.313 3.36a.183.183 0 00.366 0l.352-3.36-.352-3.49a.183.183 0 00-.183-.166zm1.84-.67a.22.22 0 00-.22.2l-.29 4.13.29 3.5a.22.22 0 00.44 0l.33-3.5-.33-4.13a.22.22 0 00-.22-.2zm1.85-.74a.258.258 0 00-.257.237l-.27 4.83.27 3.56a.258.258 0 00.515 0l.3-3.56-.3-4.83a.258.258 0 00-.258-.237zm1.87-.56a.293.293 0 00-.293.272l-.246 5.35.246 3.56a.293.293 0 00.586 0l.277-3.56-.277-5.35a.293.293 0 00-.293-.272zm1.883-.5a.33.33 0 00-.33.31l-.22 5.82.22 3.53a.33.33 0 00.66 0l.25-3.53-.25-5.82a.33.33 0 00-.33-.31zm1.93-.08a.366.366 0 00-.366.346l-.197 5.56.197 3.5a.366.366 0 00.733 0l.22-3.5-.22-5.56a.366.366 0 00-.367-.346zm2.6-.76c-.04 0-.073.034-.073.076l-.183 6.28.183 3.44c0 .042.033.077.073.077a.077.077 0 00.077-.077l.207-3.44-.207-6.28a.077.077 0 00-.077-.076zm1.05-.37a.44.44 0 00-.44.42l-.15 6.62.15 3.39a.44.44 0 00.88 0l.17-3.39-.17-6.62a.44.44 0 00-.44-.42zm2.77-1.17c-.243 0-.474.048-.69.133a5.876 5.876 0 00-5.83-5.21 5.82 5.82 0 00-1.89.315.478.478 0 00-.317.456v13.16c.005.26.22.473.48.488h8.246A3.26 3.26 0 0024 13.66a3.26 3.26 0 00-3.262-3.26z"/></svg>',
    audiomack: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.333 14.667C1.493 14.667 0 16.16 0 18s1.493 3.333 3.333 3.333S6.667 19.84 6.667 18V6l13.333-3.333v12c-1.84 0-3.333 1.493-3.333 3.333s1.493 3.333 3.333 3.333S23.333 19.84 23.333 18V2.667L6.667 6.667V18c0-1.84-1.493-3.333-3.334-3.333z"/></svg>',
};

// ================================================================
// RENDERER
// ================================================================
// ================================================================
// MOBILE DETECTION
// ================================================================
const isMobile = ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth <= 768;
const MAX_PIXEL_RATIO = isMobile ? 1.5 : 2;

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
renderer.setClearColor(0x000000, 1);

// ================================================================
// SCENE
// ================================================================
const { scene, camera, uniforms, onResize: sceneResize } = createScene(renderer);

// ================================================================
// POST PROCESSING
// ================================================================
const { composer, update: ppUpdate, onResize: ppResize } = createPostProcessing(renderer, scene, camera, isMobile);

// ================================================================
// AUDIO ENGINE
// ================================================================
const audioEngine = new AudioEngine();

// ================================================================
// SUB KNOB COMPONENT (~70 lines)
// ================================================================
class SubKnob {
    constructor(el, initialValue = 1.0) {
        this.el = el;
        this.value = initialValue;
        this.min = 0;
        this.max = 2;
        this.onChange = null;

        this._dragging = false;
        this._lastY = 0;

        this._updateVisual();

        // Pointer drag
        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this._dragging = true;
            this._lastY = e.clientY;
            el.setPointerCapture(e.pointerId);
        });

        el.addEventListener('pointermove', (e) => {
            if (!this._dragging) return;
            const deltaY = e.clientY - this._lastY;
            this._lastY = e.clientY;
            this._adjust(-deltaY * 0.01);
        });

        el.addEventListener('pointerup', () => { this._dragging = false; });
        el.addEventListener('pointercancel', () => { this._dragging = false; });

        // Scroll wheel
        el.addEventListener('wheel', (e) => {
            e.preventDefault();
            this._adjust(-e.deltaY * 0.002);
        }, { passive: false });

        // Keyboard
        el.addEventListener('keydown', (e) => {
            const steps = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.2, PageDown: -0.2 };
            if (e.key === 'Home') { this._set(0); e.preventDefault(); }
            else if (e.key === 'End') { this._set(2); e.preventDefault(); }
            else if (steps[e.key] !== undefined) { this._adjust(steps[e.key]); e.preventDefault(); }
        });
    }

    _adjust(delta) {
        this._set(Math.max(this.min, Math.min(this.max, this.value + delta)));
    }

    _set(val) {
        this.value = Math.round(val * 100) / 100; // avoid float drift
        this._updateVisual();
        if (this.onChange) this.onChange(this.value);
    }

    _updateVisual() {
        this.el.style.setProperty('--val', this.value);
        this.el.setAttribute('aria-valuenow', this.value.toFixed(2));

        const wrap = this.el.closest('.sub-knob-wrap');

        if (this.value <= 0) {
            // Grayed out
            this.el.style.setProperty('--knob-border', 'rgba(128, 128, 140, 0.3)');
            this.el.style.setProperty('--knob-pointer', 'rgba(128, 128, 140, 0.5)');
            this.el.style.setProperty('--knob-shadow', '0 4px 16px rgba(0, 0, 0, 0.35)');
            if (wrap) wrap.querySelector('.sub-knob-label').style.setProperty('--knob-label', 'rgba(128, 128, 140, 0.4)');
        } else {
            // Interpolate: standard cyan → bright glowing blue
            const t = this.value / this.max; // 0 → 1
            const r = Math.round(114 + (150 - 114) * t);
            const g = Math.round(221 + (235 - 221) * t);
            const b = Math.round(249 + (255 - 249) * t);
            const borderAlpha = (0.25 + t * 0.55).toFixed(2);
            const pointerAlpha = (0.6 + t * 0.4).toFixed(2);
            const glowSize = Math.round(t * 20);
            const glowAlpha = (t * 0.4).toFixed(2);

            this.el.style.setProperty('--knob-border', `rgba(${r}, ${g}, ${b}, ${borderAlpha})`);
            this.el.style.setProperty('--knob-pointer', `rgba(${r}, ${g}, ${b}, ${pointerAlpha})`);
            this.el.style.setProperty('--knob-shadow', `0 4px 16px rgba(0, 0, 0, 0.35), 0 0 ${glowSize}px rgba(${r}, ${g}, ${b}, ${glowAlpha})`);
            if (wrap) wrap.querySelector('.sub-knob-label').style.setProperty('--knob-label', `rgba(${r}, ${g}, ${b}, ${(0.4 + t * 0.3).toFixed(2)})`);
        }
    }
}

// ================================================================
// RENDER PLATFORM BUTTONS
// ================================================================
function renderPlatformButtons() {
    const container = document.getElementById('platform-buttons');
    if (!container) return;

    PLATFORM_LINKS.forEach(({ slug, label, href }) => {
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'platform-pill';
        a.setAttribute('aria-label', `Pre-save on ${label}`);
        a.innerHTML = `${BRAND_ICONS[slug] || ''}<span>${label}</span>`;
        container.appendChild(a);
    });
}

// ================================================================
// COUNTDOWN
// ================================================================
const RELEASE_DATE = new Date(2026, 4, 1, 0, 0, 0); // May 1, 2026 local

function updateCountdown() {
    const el = document.getElementById('countdown');
    if (!el) return;

    const now = Date.now();
    const diff = RELEASE_DATE.getTime() - now;

    if (diff <= 0) {
        el.textContent = 'OUT NOW';
        el.classList.add('out-now');
        return;
    }

    const totalSec = Math.floor(diff / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    if (days > 0) {
        el.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else {
        el.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

// ================================================================
// SHARE HANDLER
// ================================================================
function initShare() {
    const btn = document.getElementById('share-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const shareData = {
            title: 'Too Deep — Jeff Sorkowitz',
            text: "Pre-save Jeff Sorkowitz's new track 'Too Deep', out May 1",
            url: window.location.href,
        };

        if (navigator.share) {
            try { await navigator.share(shareData); } catch (_) { /* user cancelled */ }
        } else {
            try {
                await navigator.clipboard.writeText(window.location.href);
                showToast();
            } catch (_) { /* clipboard blocked */ }
        }
    });
}

function showToast() {
    const toast = document.getElementById('share-toast');
    if (!toast) return;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

// ================================================================
// PANEL STATE
// ================================================================
let isPanelOpen = false;

function initPanel() {
    const assembly = document.getElementById('bottom-assembly');
    const panel = document.getElementById('bottom-panel');
    const backdrop = document.getElementById('panel-backdrop');
    const toggle = document.querySelector('.presave-toggle');
    if (!assembly || !panel || !backdrop || !toggle) return;

    const tier2Inner = panel.querySelector('.tier2-inner');

    function setPanel(open) {
        isPanelOpen = open;
        assembly.classList.toggle('expanded', open);
        backdrop.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));

        // Set exact max-height for tight animation (no invisible range)
        if (tier2Inner) {
            if (open) {
                tier2Inner.style.maxHeight = tier2Inner.scrollHeight + 'px';
            } else {
                // Animate FROM current height to collapsed peek
                tier2Inner.style.maxHeight = tier2Inner.scrollHeight + 'px';
                // Force reflow so the browser registers the starting value
                tier2Inner.offsetHeight; // eslint-disable-line no-unused-expressions
                tier2Inner.style.maxHeight = '48px';
            }
        }

        if (!open) {
            toggle.focus();
        }
    }

    toggle.addEventListener('click', () => setPanel(!isPanelOpen));
    backdrop.addEventListener('click', () => setPanel(false));

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPanelOpen) {
            setPanel(false);
        }
    });

    // Scroll / Swipe to open/close
    window.addEventListener('wheel', (e) => {
        // Ignore if scrolling on the knob to allow sub gain adjustment
        if (e.target.closest('.sub-knob')) return;

        if (e.deltaY > 10 && !isPanelOpen) {
            setPanel(true);
        } else if (e.deltaY < -10 && isPanelOpen) {
            setPanel(false);
        }
    }, { passive: true });

    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
        if (window.innerWidth <= 768) return; // Disable swipe on mobile
        if (e.target.closest('.sub-knob')) return;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (window.innerWidth <= 768) return; // Disable swipe on mobile
        if (e.target.closest('.sub-knob')) return;
        const touchY = e.touches[0].clientY;
        const deltaY = touchStartY - touchY;

        if (deltaY > 30 && !isPanelOpen) {
            setPanel(true);
            touchStartY = touchY; // reset to avoid multiple triggers
        } else if (deltaY < -30 && isPanelOpen) {
            setPanel(false);
            touchStartY = touchY;
        }
    }, { passive: true });
}

// ================================================================
// PLAY BUTTON + GLOW CTA
// ================================================================
let subGain = 1.0;

const PLAY_SVG = '<svg class="play-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,4 20,12 8,20"/></svg>';
const PAUSE_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';

function initPlayButton() {
    const playBtn = document.getElementById('play-btn');
    if (!playBtn) return;

    // Glow CTA — first visit only
    if (!localStorage.getItem('tooDeep.glowSeen')) {
        playBtn.classList.add('glow-cta');
    }

    playBtn.addEventListener('click', async () => {
        // Remove glow on first play
        if (playBtn.classList.contains('glow-cta')) {
            playBtn.classList.remove('glow-cta');
            localStorage.setItem('tooDeep.glowSeen', '1');
        }

        // Phase 1: Create + resume AudioContext synchronously in the gesture
        // (iOS expires gestures after any await — this MUST come first)
        audioEngine.createContext();

        // Phase 2: Load audio if needed (async, gesture can expire)
        if (!audioEngine.audioBuffer) {
            await audioEngine.loadAudio();
        }

        await audioEngine.toggle();
        playBtn.classList.toggle('playing', audioEngine.getIsPlaying());
        playBtn.innerHTML = audioEngine.getIsPlaying() ? PAUSE_SVG : PLAY_SVG;
    });
}

// ================================================================
// SUB KNOB INIT
// ================================================================
function initSubKnob() {
    const knobEl = document.getElementById('sub-knob');
    if (!knobEl) return;

    const knob = new SubKnob(knobEl, 1.0);
    knob.onChange = (val) => {
        subGain = val;
    };
}

// ================================================================
// ONSET AGE TRACKING
// ================================================================
let timeSinceOnset = 99.0;
const ONSET_TRIGGER_THRESHOLD = 0.35;

// ================================================================
// MOUSE / TOUCH
// ================================================================
const mousePos = new THREE.Vector2(0.5, 0.5);
const smoothMousePos = new THREE.Vector2(0.5, 0.5);
const prevMousePos = new THREE.Vector2(0.5, 0.5);
const MOUSE_MOMENTUM = 0.06;

function onPointerMove(e) {
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) / window.innerWidth;
    const y = 1.0 - (e.clientY || e.touches?.[0]?.clientY || 0) / window.innerHeight;
    mousePos.set(x, y);
}

window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerdown', onPointerMove);

// ================================================================
// RESIZE
// ================================================================
function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

    sceneResize();
    ppResize();
}
window.addEventListener('resize', onResize);

// ================================================================
// ANIMATION LOOP
// ================================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    // Smooth mouse
    prevMousePos.copy(smoothMousePos);
    smoothMousePos.lerp(mousePos, MOUSE_MOMENTUM);

    // Update audio engine and get smoothed bands
    const audioBands = audioEngine.update();

    // Track onset age — reset on onset, increment otherwise
    const effOnset = (audioBands.lowOnset || 0) * subGain;
    if (effOnset > ONSET_TRIGGER_THRESHOLD) {
        timeSinceOnset = 0.0;
    } else {
        timeSinceOnset += dt;
    }

    // Update uniforms
    uniforms.uTime.value = elapsed;
    uniforms.uMousePos.value.copy(smoothMousePos);

    // Update post processing with audio bands, sub gain, and onset age
    ppUpdate(elapsed, smoothMousePos, prevMousePos, audioBands, subGain, timeSinceOnset);

    // Render through composer
    composer.render();
}

// ================================================================
// INIT
// ================================================================
document.fonts.ready.then(() => {
    setTimeout(() => {
        sceneResize();

        // UI init
        renderPlatformButtons();
        updateCountdown();
        setInterval(updateCountdown, 1000);
        initShare();
        initPanel();
        initPlayButton();
        initSubKnob();

        // Start render loop
        animate();
    }, 100);
});
