/**
 * Text Renderer — renders "TOO DEEP" and "JEFF SORKOWITZ" to CanvasTexture
 * Text is center-pinned: vertical position scales with width, not height
 */
import * as THREE from 'three';

const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;
const MAX_DESKTOP_SCALE = 1.0;
const IS_MOBILE_PORTRAIT = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;

// Reserve space at bottom for the control panel so text never overlaps it
const PANEL_RESERVE = IS_MOBILE_PORTRAIT ? 160 : 110;

/**
 * Create a canvas texture for the "TOO DEEP" title text
 * Position is pinned to center of available area (viewport minus panel zone)
 */
export function createTitleTexture(viewportWidth, viewportHeight) {
    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = viewportWidth * dpr;
    canvas.height = viewportHeight * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);

    const widthScale = viewportWidth / REF_WIDTH;
    const heightScale = viewportHeight / REF_HEIGHT;
    const MIN_MOBILE_SCALE = 0.35;
    const scale = IS_MOBILE_PORTRAIT ? Math.max(widthScale * 1.05, MIN_MOBILE_SCALE) : Math.min(widthScale, heightScale, MAX_DESKTOP_SCALE);

    const fontSize = Math.round(600 * scale);
    const letterSpacingTOO = -50 * scale;
    const letterSpacingDEEP = -60 * scale;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#72ddf9';
    ctx.font = `400 ${fontSize}px Italiana`;

    // Center in available area (above panel), with slight downward nudge
    const centerY = (viewportHeight - PANEL_RESERVE) / 2 + 45 * scale;
    const tooOffsetFromCenter = -270 * scale;
    const deepOffsetFromCenter = 270 * scale;

    const tooY = centerY + tooOffsetFromCenter;
    const deepY = centerY + deepOffsetFromCenter;

    drawTextWithSpacing(ctx, 'TOO', viewportWidth * 0.5, tooY, letterSpacingTOO);
    drawTextWithSpacing(ctx, 'DEEP', viewportWidth * 0.5, deepY, letterSpacingDEEP);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return { texture, canvas };
}

/**
 * Create a canvas texture for the "JEFF SORKOWITZ" artist text
 * Centered between TOO and DEEP
 */
export function createArtistTexture(viewportWidth, viewportHeight) {
    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = viewportWidth * dpr;
    canvas.height = viewportHeight * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);

    const widthScale = viewportWidth / REF_WIDTH;
    const heightScale = viewportHeight / REF_HEIGHT;
    const MIN_MOBILE_SCALE = 0.35;
    const scale = IS_MOBILE_PORTRAIT ? Math.max(widthScale * 1.35, MIN_MOBILE_SCALE) : Math.min(widthScale, heightScale, MAX_DESKTOP_SCALE);
    const fontSize = Math.round(100 * scale);
    const letterSpacing = 2 * scale;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#79cce1';
    ctx.font = `400 ${fontSize}px Aspekta-450, sans-serif`;

    // Center in available area (above panel)
    const centerY = (viewportHeight - PANEL_RESERVE) / 2 + 60 * scale;
    const artistOffsetFromCenter = -43 * scale;

    drawTextWithSpacing(ctx, 'JEFF SORKOWITZ', viewportWidth * 0.48, centerY + artistOffsetFromCenter, letterSpacing);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return { texture, canvas };
}

/**
 * Draw text character by character with custom letter spacing
 * Simple fillText only — no outline/stroke to avoid doubling artifacts
 */
function drawTextWithSpacing(ctx, text, x, y, spacing) {
    const chars = text.split('');

    let totalWidth = 0;
    for (let i = 0; i < chars.length; i++) {
        totalWidth += ctx.measureText(chars[i]).width;
        if (i < chars.length - 1) totalWidth += spacing;
    }

    const savedAlign = ctx.textAlign;
    ctx.textAlign = 'left';

    let currentX = x - totalWidth / 2;

    for (let i = 0; i < chars.length; i++) {
        ctx.fillText(chars[i], currentX, y);
        currentX += ctx.measureText(chars[i]).width + spacing;
    }

    ctx.textAlign = savedAlign;
}
