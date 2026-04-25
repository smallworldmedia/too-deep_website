/**
 * Text Renderer — renders "TOO DEEP" and "JEFF SORKOWITZ" to CanvasTexture
 * Text is center-pinned: vertical position scales with width, not height
 */
import * as THREE from 'three';

const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;
const IS_MOBILE_PORTRAIT = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;

/**
 * Create a canvas texture for the "TOO DEEP" title text
 * Position is pinned to center — Y offset calculated relative to center, scaled by width
 */
export function createTitleTexture(viewportWidth, viewportHeight) {
    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = viewportWidth * dpr;
    canvas.height = viewportHeight * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);

    // On mobile portrait, scale by width so text fills the viewport
    // Use a minimum floor so text is never tiny on narrow screens
    // On desktop/landscape, use min to prevent overflow
    const widthScale = viewportWidth / REF_WIDTH;
    const heightScale = viewportHeight / REF_HEIGHT;
    const MIN_MOBILE_SCALE = 0.42;
    const scale = IS_MOBILE_PORTRAIT ? Math.max(widthScale * 1.35, MIN_MOBILE_SCALE) : Math.min(widthScale, heightScale);

    // Font size scales with viewport width
    const fontSize = Math.round(600 * scale);
    const letterSpacingTOO = -50 * scale;
    const letterSpacingDEEP = -60 * scale;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#72ddf9';
    ctx.font = `400 ${fontSize}px Italiana`;

    // Center-pinned with slight downward nudge so TOO stays in view
    const centerY = viewportHeight / 2 + 45 * scale;
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
    const MIN_MOBILE_SCALE = 0.42;
    const scale = IS_MOBILE_PORTRAIT ? Math.max(widthScale * 1.35, MIN_MOBILE_SCALE) : Math.min(widthScale, heightScale);
    const fontSize = Math.round(100 * scale);
    const letterSpacing = 2 * scale;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#79cce1';
    ctx.font = `400 ${fontSize}px Aspekta-450, sans-serif`;

    // Center-pinned: artist text sits at vertical center
    const centerY = viewportHeight / 2 + 60 * scale;
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

    // Measure total width with spacing
    let totalWidth = 0;
    for (let i = 0; i < chars.length; i++) {
        totalWidth += ctx.measureText(chars[i]).width;
        if (i < chars.length - 1) totalWidth += spacing;
    }

    let currentX = x - totalWidth / 2;

    for (let i = 0; i < chars.length; i++) {
        const charWidth = ctx.measureText(chars[i]).width;
        ctx.fillText(chars[i], currentX + charWidth / 2, y);
        currentX += charWidth + spacing;
    }
}
