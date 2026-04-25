/**
 * Audio Engine — Web Audio API playback with pre-baked frequency band sync
 * Reads frequency-data.json and provides smoothed band values per frame
 * Supports proper pause/resume and continuous looping
 * 
 * Uses HTML5 <audio> element + MediaElementSource for maximum iOS compatibility.
 * The <audio> element handles decoding natively — avoids decodeAudioData() issues
 * on mobile Safari with large WAV files.
 * 
 * lowOnset is passed through RAW (no smoothing) — it's an instantaneous event
 */

import frequencyData from './data/frequency-data.json';

// Asymmetric lag — fast attack, slow release (TouchDesigner-style)
const ATTACK_FACTOR = 0.4;  // How fast the value rises (higher = faster)
const RELEASE_FACTOR = 0.18; // How slow the value falls (higher = slower/smoother)

export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.gainNode = null;
        this.mediaSource = null;
        this.audioElement = null;
        this.isPlaying = false;
        this.ready = false;

        // Smoothed band values (lowOnset is raw, not smoothed)
        this.bands = { low: 0, mid: 0, high: 0, lowOnset: 0 };
        this.rawBands = { low: 0, mid: 0, high: 0, lowOnset: 0 };

        // Pre-baked data
        this.freqData = frequencyData;
        this.fps = frequencyData.fps;
        this.totalFrames = frequencyData.totalFrames;
        this.duration = frequencyData.duration;
    }

    /**
     * Phase 1 — MUST be called synchronously inside a user gesture (click/tap).
     * Creates the AudioContext, audio element, and connects everything.
     * iOS requires AudioContext creation + resume within the gesture.
     */
    createContext() {
        if (this.audioContext) return;

        // 1. Create AudioContext
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // 2. Create HTML5 audio element — iOS handles WAV decoding natively
        this.audioElement = new Audio('/too-deep_snippet-02.wav');
        this.audioElement.loop = true;
        this.audioElement.preload = 'auto';
        this.audioElement.crossOrigin = 'anonymous';
        // Prevent iOS from showing media controls in control center
        this.audioElement.setAttribute('playsinline', '');

        // 3. Route through Web Audio API for potential future analysis
        this.mediaSource = this.audioContext.createMediaElementSource(this.audioElement);
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = 1.0;
        this.mediaSource.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);

        // 4. Resume immediately — iOS requires this within the gesture
        this.audioContext.resume();

        // 5. Mark ready once audio element can play
        this.audioElement.addEventListener('canplaythrough', () => {
            this.ready = true;
        }, { once: true });

        // If already cached, mark ready immediately
        if (this.audioElement.readyState >= 4) {
            this.ready = true;
        }
    }

    /**
     * Wait for the audio element to be ready to play.
     * Returns immediately if already ready.
     */
    async waitForReady() {
        if (this.ready) return;
        return new Promise((resolve) => {
            this.audioElement.addEventListener('canplaythrough', resolve, { once: true });
            // Safety timeout — don't block forever
            setTimeout(resolve, 8000);
        });
    }

    async play() {
        if (this.isPlaying) return;
        if (!this.audioContext || !this.audioElement) return;

        // Ensure context is running
        if (this.audioContext.state !== 'running') {
            await this.audioContext.resume();
        }

        // Wait for audio to be ready
        await this.waitForReady();

        try {
            await this.audioElement.play();
            this.isPlaying = true;
        } catch (err) {
            console.warn('[AudioEngine] play() failed:', err);
        }
    }

    pause() {
        if (!this.isPlaying || !this.audioElement) return;
        this.audioElement.pause();
        this.isPlaying = false;
    }

    async toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            await this.play();
        }
    }

    getCurrentTime() {
        if (!this.audioElement) return 0;
        return this.audioElement.currentTime % this.duration;
    }

    _smoothValue(current, target) {
        if (target > current) {
            return current + (target - current) * ATTACK_FACTOR;
        } else {
            return current * RELEASE_FACTOR + target * (1 - RELEASE_FACTOR);
        }
    }

    update() {
        if (!this.isPlaying) {
            this.bands.low *= RELEASE_FACTOR;
            this.bands.mid *= RELEASE_FACTOR;
            this.bands.high *= RELEASE_FACTOR;
            this.bands.lowOnset = 0; // Onsets are instant — zero when paused
            return this.bands;
        }

        const elapsed = this.getCurrentTime();
        const frameIndex = Math.min(
            Math.floor(elapsed * this.fps),
            this.totalFrames - 1
        );

        if (frameIndex >= 0 && frameIndex < this.totalFrames) {
            const frame = this.freqData.frames[frameIndex];
            this.rawBands.low = frame.low;
            this.rawBands.mid = frame.mid;
            this.rawBands.high = frame.high;
            this.rawBands.lowOnset = frame.lowOnset || 0;
        }

        // Asymmetric smoothing for continuous bands
        this.bands.low = this._smoothValue(this.bands.low, this.rawBands.low);
        this.bands.mid = this._smoothValue(this.bands.mid, this.rawBands.mid);
        this.bands.high = this._smoothValue(this.bands.high, this.rawBands.high);

        // lowOnset: RAW pass-through — no smoothing (instantaneous events)
        this.bands.lowOnset = this.rawBands.lowOnset;

        return this.bands;
    }

    getBands() {
        return this.bands;
    }

    getIsPlaying() {
        return this.isPlaying;
    }
}
