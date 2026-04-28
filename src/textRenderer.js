/**
 * Text Renderer — renders "TOO DEEP" and "JEFF SORKOWITZ" to CanvasTexture
 * 
 * Scaling strategy (mobile):
 *   All reserves are proportional to the viewport — no hard-coded pixel values.
 *   scale = min(widthScale, heightScale) guarantees no clipping in either axis.
 * 
 * Scaling strategy (desktop):
 *   Classic reference-based scaling capped at 1.0.
 */
import * as THREE from 'three';

const REF_WIDTH = 1920;
const REF_HEIGHT = 1080;
const MAX_DESKTOP_SCALE = 1.0;

// The text group's total rendered height at scale=1:
//   TOO center at -270, DEEP center at +270 → center span = 540
//   Each glyph extends ~fontSize/2 above & below (textBaseline: 'middle')
//   Total ≈ 540 + 600 = 1140, plus descender margin → ~1500px
const TEXT_GROUP_HEIGHT_AT_SCALE_1 = 1500;

// Approximate rendered width of "DEEP" at scale=1 (fontSize 600, spacing -60)
// This is the widest element; used as the horizontal reference for mobile fitting
const TEXT_GROUP_WIDTH_AT_SCALE_1 = 1400;

function isMobilePortrait() {
    return window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
}

/**
 * Compute the scale factor that ensures text fits both horizontally and vertically.
 * All reserves are viewport-proportional on mobile.
 * Returns { scale, centerY }
 */
function computeFittedScale(viewportWidth, viewportHeight) {
    const mobile = isMobilePortrait();

    if (!mobile) {
        // Desktop: classic reference-based scaling
        const widthScale = viewportWidth / REF_WIDTH;
        const heightScale = viewportHeight / REF_HEIGHT;
        const PANEL_RESERVE = 110;
        const TOP_PADDING = 20;
        const scale = Math.min(widthScale, heightScale, MAX_DESKTOP_SCALE);
        const availableHeight = viewportHeight - PANEL_RESERVE - TOP_PADDING;
        const maxHeightScale = availableHeight / TEXT_GROUP_HEIGHT_AT_SCALE_1;
        const finalScale = Math.min(scale, maxHeightScale);
        const centerY = TOP_PADDING + availableHeight / 2;
        return { scale: finalScale, centerY };
    }

    // ── Mobile: fully proportional ──────────────────────────────

    // Reserve proportional slices of the viewport for UI elements:
    //   Bottom: control panel + SWM footer + safe area ≈ 28% of viewport height
    //   Top: status bar + breathing room ≈ 7% of viewport height
    //   Sides: breathing room ≈ 4% of viewport width per side
    const PANEL_RESERVE = viewportHeight * 0.28;
    const TOP_PADDING = viewportHeight * 0.07;
    const SIDE_PADDING = viewportWidth * 0.04;

    // Available drawing area
    const availableWidth = viewportWidth - 2 * SIDE_PADDING;
    const availableHeight = viewportHeight - PANEL_RESERVE - TOP_PADDING;

    // Compute scale from both axes — use the smaller one
    const widthScale = availableWidth / TEXT_GROUP_WIDTH_AT_SCALE_1;
    const heightScale = availableHeight / TEXT_GROUP_HEIGHT_AT_SCALE_1;
    const scale = Math.min(widthScale, heightScale);

    // Center the text group in the available area
    const centerY = TOP_PADDING + availableHeight / 2;

    return { scale, centerY };
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
 * Centered between TOO and DEEP — uses the same scale as the title (no boost)
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

    // No artistBoost — artist uses the exact same scale as the title
    const fontSize = Math.round(100 * scale);
    const letterSpacing = 2 * scale;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#79cce1';
    ctx.font = `400 ${fontSize}px Aspekta-450, sans-serif`;

    // Position artist name slightly above center (between TOO and DEEP)
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
