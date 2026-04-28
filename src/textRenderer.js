/**
 * Text Renderer — renders "TOO DEEP" and "JEFF SORKOWITZ" to CanvasTexture
 * 
 * Scaling strategy:
 *   1. Compute a width-based scale (text must not overflow horizontally)
 *   2. Compute a height-based scale (text group must fit between top of viewport
 *      and top of the control panel, with padding)
 *   3. Use the SMALLER of the two — guarantees no clipping in either axis
 */
import * as THREE from 'three';

const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;
const MAX_DESKTOP_SCALE = 1.0;

// The text group's total height at scale=1 is:
//   TOO center at -270, DEEP center at +270 → span between centers = 540
//   Each line extends ~fontSize/2 above and below center (textBaseline: 'middle')
//   Total: 540 + 600 (full glyph height of TOO) + ~some descender margin = ~1500px
const TEXT_GROUP_HEIGHT_AT_SCALE_1 = 1500;

function isMobilePortrait() {
    return window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
}

/**
 * Compute the scale factor that ensures text fits both horizontally and vertically.
 * Returns { scale, centerY }
 */
function computeFittedScale(viewportWidth, viewportHeight) {
    const mobile = isMobilePortrait();

    // Panel reserve: control panel height + bottom offset + safe-area + SWM footer
    // Must match the actual CSS footprint so text never overlaps
    const PANEL_RESERVE = mobile ? 240 : 110;
    const TOP_PADDING = mobile ? 60 : 20;
    // Side padding: match the 16px used by SWM footer and controls-group
    const SIDE_PADDING = mobile ? 16 : 0;

    // Width-based scale — account for horizontal padding
    const effectiveWidth = viewportWidth - 2 * SIDE_PADDING;
    const widthScale = effectiveWidth / REF_WIDTH;
    const heightScale = viewportHeight / REF_HEIGHT;

    let candidateScale;
    if (mobile) {
        candidateScale = Math.max(widthScale * 1.05, 0.35);
    } else {
        candidateScale = Math.min(widthScale, heightScale, MAX_DESKTOP_SCALE);
    }

    // Height-based constraint:
    // The available vertical space = viewport - panel - top padding
    const availableHeight = viewportHeight - PANEL_RESERVE - TOP_PADDING;
    const maxHeightScale = availableHeight / TEXT_GROUP_HEIGHT_AT_SCALE_1;

    // Use the smaller of width-based and height-based scales
    const scale = Math.min(candidateScale, maxHeightScale);

    // Center the text group in the available area (above panel)
    const centerY = TOP_PADDING + availableHeight / 2;

    return { scale, PANEL_RESERVE, centerY };
}

/**
 * Create a canvas texture for the "TOO DEEP" title text
 */
export function createTitleTexture(viewportWidth, viewportHeight) {
    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = viewportWidth * dpr;
    canvas.height = viewportHeight * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);

    const { scale, centerY } = computeFittedScale(viewportWidth, viewportHeight);

    const fontSize = Math.round(600 * scale);
    const letterSpacingTOO = -50 * scale;
    const letterSpacingDEEP = -60 * scale;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#72ddf9';
    ctx.font = `400 ${fontSize}px Italiana`;

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

    const { scale, centerY } = computeFittedScale(viewportWidth, viewportHeight);

    // Artist text is slightly larger relative to title scale on mobile
    const mobile = isMobilePortrait();
    const artistBoost = mobile ? 1.1 : 1.0;
    const artistScale = scale * artistBoost;

    const fontSize = Math.round(100 * artistScale);
    const letterSpacing = 2 * artistScale;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#79cce1';
    ctx.font = `400 ${fontSize}px Aspekta-450, sans-serif`;

    // Position artist name below center — between the two title words, pushed toward DEEP
    const artistOffsetFromCenter = -28 * scale;

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
    const widths = chars.map(c => ctx.measureText(c).width);

    let totalWidth = 0;
    for (let i = 0; i < chars.length; i++) {
        totalWidth += widths[i];
        if (i < chars.length - 1) totalWidth += spacing;
    }

    const savedAlign = ctx.textAlign;
    ctx.textAlign = 'left';

    let currentX = x - totalWidth / 2;

    for (let i = 0; i < chars.length; i++) {
        ctx.fillText(chars[i], currentX, y);
        currentX += widths[i] + spacing;
    }

    ctx.textAlign = savedAlign;
}
