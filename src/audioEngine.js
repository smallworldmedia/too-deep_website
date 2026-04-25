/**
 * Audio Engine — Web Audio API playback with pre-baked frequency band sync
 * Reads frequency-data.json and provides smoothed band values per frame
 * Supports proper pause/resume and continuous looping
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
        this.sourceNode = null;
        this.audioBuffer = null;
        this.isPlaying = false;

        // Pause/resume tracking
        this.pauseOffset = 0;
        this.playStartTime = 0;

        // Smoothed band values (lowOnset is raw, not smoothed)
        this.bands = { low: 0, mid: 0, high: 0, lowOnset: 0 };
        this.rawBands = { low: 0, mid: 0, high: 0, lowOnset: 0 };

        // Pre-baked data
        this.freqData = frequencyData;
        this.fps = frequencyData.fps;
        this.totalFrames = frequencyData.totalFrames;
        this.duration = frequencyData.duration;
    }

    async init() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const response = await fetch('/too-deep_snippet-01.wav');
        const arrayBuffer = await response.arrayBuffer();
        this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    }

    play() {
        if (this.isPlaying) return;
        if (!this.audioContext) return;

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (this.pauseOffset >= this.duration) {
            this.pauseOffset = 0;
        }

        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.loop = true;
        this.sourceNode.connect(this.audioContext.destination);

        this.sourceNode.start(0, this.pauseOffset);
        this.playStartTime = this.audioContext.currentTime;
        this.isPlaying = true;
    }

    pause() {
        if (!this.isPlaying || !this.sourceNode) return;

        const elapsed = this.audioContext.currentTime - this.playStartTime;
        this.pauseOffset = (this.pauseOffset + elapsed) % this.duration;

        this.sourceNode.stop();
        this.sourceNode = null;
        this.isPlaying = false;
    }

    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    getCurrentTime() {
        if (this.isPlaying) {
            const raw = this.pauseOffset + (this.audioContext.currentTime - this.playStartTime);
            return raw % this.duration;
        }
        return this.pauseOffset;
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
