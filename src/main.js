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
    { slug: 'spotify', label: 'Spotify', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/spotify', logo: '/logos/Spotify_Full_Logo_RGB_White.png' },
    { slug: 'applemusic', label: 'Apple Music', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/applemusic', logo: '/logos/apple-music.svg' },
    { slug: 'deezer', label: 'Deezer', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/deezer', logo: '/logos/deezer-logo.png' },
    { slug: 'amazonmusic', label: 'Amazon Music', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/amazonmusic', logo: '/logos/Amazon_Music_Logo_Stacked_RGB_White_MASTER.svg' },
    { slug: 'tidal', label: 'TIDAL', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/tidal', logo: '/logos/tidal_icon-white-rgb.svg' },
    { slug: 'soundcloud', label: 'SoundCloud', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/soundcloud', logo: '/logos/soundcloud.png' },
    { slug: 'audiomack', label: 'Audiomack', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/audiomack', logo: '/logos/audiomack.svg' },
];

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
// BASS KNOB — Ring LED Rotation Engine
// ================================================================
function initBassKnob() {
    const bassKnob = document.getElementById('bass-knob');
    const bassLabel = document.getElementById('bass-label');
    if (!bassKnob || !bassLabel) return;

    const pivots = bassKnob.querySelectorAll('.sub-knob-pivot, .sub-knob-pivot-notch');
    const ringOuter = document.getElementById('bass-ring');
    const notchElement = bassKnob.querySelector('.knob-embossed-notch');
    let isDragging = false;
    let startY = 0;
    let currentRotation = parseInt(bassKnob.dataset.rotation || 360);

    // Generate LED segments
    ringOuter.innerHTML = '';
    const numSegments = 26;
    const segmentsArray = [];
    for (let i = 0; i <= numSegments; i++) {
        const segContainer = document.createElement('div');
        segContainer.style.cssText = 'position:absolute;top:50%;left:50%;transform-origin:bottom center;height:40px;width:6px;margin-left:-3px;margin-top:-40px;';
        const angle = 210 + (300 / numSegments) * i;
        segContainer.style.transform = `rotate(${angle}deg)`;
        const led = document.createElement('div');
        led.className = 'led-segment-notch';
        led.style.setProperty('--seg-clr', `hsl(${195 - 8 * (i / numSegments)}, 100%, 50%)`);
        segContainer.appendChild(led);
        ringOuter.appendChild(segContainer);
        segmentsArray.push({ angle, el: led });
    }

    pivots.forEach(p => p.style.transform = `rotate(${currentRotation}deg)`);

    function updateRing(rot) {
        segmentsArray.forEach(seg => {
            if (rot > 212 && seg.angle <= rot + 2) {
                seg.el.classList.add('active');
            } else {
                seg.el.classList.remove('active');
            }
        });
        if (rot > 215) {
            notchElement.classList.add('glow-on'); notchElement.classList.remove('glow-off');
            bassLabel.classList.add('glow-on'); bassLabel.classList.remove('glow-off');
        } else {
            notchElement.classList.add('glow-off'); notchElement.classList.remove('glow-on');
            bassLabel.classList.add('glow-off'); bassLabel.classList.remove('glow-on');
        }
        // Map rotation 210→510 to subGain 0→2
        subGain = Math.max(0, Math.min(2, ((rot - 210) / 300) * 2));
    }

    updateRing(currentRotation);

    bassKnob.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isDragging = true;
        startY = e.clientY;
        bassKnob.setPointerCapture(e.pointerId);
        document.body.style.cursor = 'ns-resize';
    });

    bassKnob.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const deltaY = startY - e.clientY;
        currentRotation += deltaY * 2.0;
        currentRotation = Math.max(210, Math.min(510, currentRotation));
        pivots.forEach(p => p.style.transform = `rotate(${currentRotation}deg)`);
        bassKnob.dataset.rotation = currentRotation;
        startY = e.clientY;
        updateRing(currentRotation);
    });

    bassKnob.addEventListener('pointerup', () => { isDragging = false; document.body.style.cursor = ''; });
    bassKnob.addEventListener('pointercancel', () => { isDragging = false; document.body.style.cursor = ''; });
}


// ================================================================
// RENDER PLATFORM BUTTONS
// ================================================================
function renderPlatformButtons() {
    const container = document.getElementById('platform-buttons');
    if (!container) return;

    PLATFORM_LINKS.forEach(({ slug, label, href, logo }, index) => {
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'platform-pill';
        a.dataset.slug = slug;
        a.setAttribute('aria-label', `Pre-save on ${label}`);
        a.style.setProperty('--i', index);
        a.innerHTML = `<img src="${logo}" alt="${label}" class="platform-logo" />`;
        container.appendChild(a);
    });
}

// ================================================================
// SHARE HANDLER
// ================================================================
function initShare() {
    const btn = document.getElementById('share-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        // When overlay is open, this button acts as close — skip share
        if (isPanelOpen) return;

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
    const overlay = document.getElementById('presave-overlay');
    const backdrop = document.getElementById('panel-backdrop');
    const presaveBtn = document.getElementById('tape-presave');
    const shareBtn = document.getElementById('share-btn');
    const releaseLabel = document.getElementById('release-label');
    const panelDivider = document.querySelector('.panel-divider-horizontal');
    if (!overlay || !backdrop || !presaveBtn) return;

    function setPanel(open) {
        isPanelOpen = open;
        overlay.classList.toggle('active', open);
        backdrop.classList.toggle('active', open);
        presaveBtn.setAttribute('aria-expanded', String(open));
        presaveBtn.classList.toggle('pressed', open);
        // Toggle share button to close mode
        if (shareBtn) {
            shareBtn.classList.toggle('close-mode', open);
            shareBtn.setAttribute('aria-label', open ? 'Close overlay' : 'Share this page');
        }
        // Hide release label + divider when overlay is open to reduce panel height
        if (releaseLabel) releaseLabel.classList.toggle('panel-label-hidden', open);
        if (panelDivider) panelDivider.classList.toggle('panel-label-hidden', open);
    }

    presaveBtn.addEventListener('click', () => setPanel(!isPanelOpen));
    backdrop.addEventListener('click', () => setPanel(false));

    // Share button: close overlay if open, otherwise share
    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            if (isPanelOpen) {
                e.stopPropagation();
                setPanel(false);
            }
        }, true); // capture phase so it fires before the share handler
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isPanelOpen) {
            setPanel(false);
        }
    });

    // Scroll / Swipe to open/close
    window.addEventListener('wheel', (e) => {
        if (e.target.closest('.sub-knob')) return;

        if (e.deltaY > 10 && !isPanelOpen) {
            setPanel(true);
        } else if (e.deltaY < -10 && isPanelOpen) {
            setPanel(false);
        }
    }, { passive: true });

    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
        if (window.innerWidth <= 768) return;
        if (e.target.closest('.sub-knob')) return;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (window.innerWidth <= 768) return;
        if (e.target.closest('.sub-knob')) return;
        const touchY = e.touches[0].clientY;
        const deltaY = touchStartY - touchY;

        if (deltaY > 30 && !isPanelOpen) {
            setPanel(true);
            touchStartY = touchY;
        } else if (deltaY < -30 && isPanelOpen) {
            setPanel(false);
            touchStartY = touchY;
        }
    }, { passive: true });
}

// ================================================================
// PLAY/PAUSE TAPE DECK — Interlocking Buttons
// ================================================================
let subGain = 1.0;

function initPlayButton() {
    const playBtn = document.getElementById('tape-play');
    const pauseBtn = document.getElementById('tape-pause');
    if (!playBtn || !pauseBtn) return;

    playBtn.addEventListener('click', async () => {
        // Update visual state immediately
        playBtn.classList.add('pressed');
        pauseBtn.classList.remove('pressed');

        try {
            audioEngine.createContext();
            if (!audioEngine.getIsPlaying()) {
                await audioEngine.toggle();
            }
        } catch (e) { console.warn('Audio play error:', e); }
    });

    pauseBtn.addEventListener('click', async () => {
        // Update visual state immediately
        pauseBtn.classList.add('pressed');
        playBtn.classList.remove('pressed');

        try {
            audioEngine.createContext();
            if (audioEngine.getIsPlaying()) {
                await audioEngine.toggle();
            }
        } catch (e) { console.warn('Audio pause error:', e); }
    });
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
let resizeTimer;
function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
        sceneResize();
        ppResize();
    }, 100);
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
// INTRO ANIMATION — choreographed entrance sequence
// ================================================================
function runIntroAnimation() {
    // Easing: starts strong, very smoothly falls into end position
    function easeOutExpo(t) {
        return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }
    // Smooth ease for cursor sweep
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Animation targets (from → to)
    const animations = [
        {
            delay: 200,     // Jeff Sorkowitz first
            duration: 700,
            update: (t) => {
                const e = easeOutExpo(t);
                uniforms.uArtistOpacity.value = e;
                uniforms.uArtistScale.value = 0.96 + 0.04 * e;
            }
        },
        {
            delay: 550,     // TOO DEEP follows
            duration: 700,
            update: (t) => {
                const e = easeOutExpo(t);
                uniforms.uTitleOpacity.value = e;
                uniforms.uTitleScale.value = 0.96 + 0.04 * e;
            }
        },
    ];

    // Synthetic cursor sweep — bottom-left to top-right
    // This triggers water ripples to show the surface is interactive
    const cursorSweep = {
        delay: 300,       // Start shortly after page loads
        duration: 1800,   // Smooth sweep duration
        startPos: { x: 0.15, y: 0.15 },  // Bottom-left (UV space: y is flipped)
        endPos: { x: 0.85, y: 0.85 },    // Top-right
        active: true,
    };

    // Bottom control elements to reveal (in order)
    const controlSelectors = [
        '.controls-panel.intro-hidden',       // Unified controls panel
    ];
    const controlStartDelay = 1000;  // As DEEP appears
    const controlStagger = 150;      // Between each control

    const startTime = performance.now();

    function tick(now) {
        const elapsed = now - startTime;
        let allDone = true;

        // Drive shader-based text animations
        for (const anim of animations) {
            const localTime = elapsed - anim.delay;
            if (localTime < 0) {
                allDone = false;
                continue;
            }
            const t = Math.min(localTime / anim.duration, 1.0);
            anim.update(t);
            if (t < 1.0) allDone = false;
        }

        // Drive synthetic cursor sweep — feeds into mousePos which
        // the render loop's smoothMousePos lerp + ripple sim naturally consume
        if (cursorSweep.active) {
            const sweepLocal = elapsed - cursorSweep.delay;
            if (sweepLocal < 0) {
                allDone = false;
            } else {
                const t = Math.min(sweepLocal / cursorSweep.duration, 1.0);
                const e = easeInOutCubic(t);
                const sx = cursorSweep.startPos.x + (cursorSweep.endPos.x - cursorSweep.startPos.x) * e;
                const sy = cursorSweep.startPos.y + (cursorSweep.endPos.y - cursorSweep.startPos.y) * e;
                mousePos.set(sx, sy);
                if (t >= 1.0) {
                    cursorSweep.active = false;
                } else {
                    allDone = false;
                }
            }
        }

        // Trigger control slide-ins via CSS class swap
        for (let i = 0; i < controlSelectors.length; i++) {
            const triggerTime = controlStartDelay + i * controlStagger;
            if (elapsed >= triggerTime) {
                const el = document.querySelector(controlSelectors[i]);
                if (el && !el.classList.contains('intro-visible')) {
                    el.classList.add('intro-visible');
                }
            } else {
                allDone = false;
            }
        }

        if (!allDone) {
            requestAnimationFrame(tick);
        }
    }

    requestAnimationFrame(tick);
}

// ================================================================
// INIT
// ================================================================
document.fonts.ready.then(() => {
    setTimeout(() => {
        sceneResize();

        // UI init
        renderPlatformButtons();
        initShare();
        initPanel();
        initPlayButton();
        initBassKnob();

        // Start render loop
        animate();

        // Start intro animation sequence
        runIntroAnimation();
    }, 100);
});
