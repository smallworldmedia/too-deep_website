/**
 * Pre-bake frequency band data + onset detection from WAV file
 * Outputs JSON with per-frame {low, mid, high, lowOnset} values at 60fps
 * 
 * Usage: node scripts/analyze-audio.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ============================================================
// CONFIG
// ============================================================
const INPUT_WAV = path.join(ROOT, 'too-deep_snippet-01.wav');
const OUTPUT_JSON = path.join(ROOT, 'src', 'data', 'frequency-data.json');
const FPS = 60;
const FFT_SIZE = 2048;

// 3 frequency bands (bin ranges depend on sample rate)
// At 48kHz with FFT_SIZE=2048: bin resolution = 48000/2048 ≈ 23.4Hz per bin
const BANDS = {
    low: { minHz: 20, maxHz: 300 },  // Sub-bass + bass
    mid: { minHz: 300, maxHz: 3000 },  // Mids
    high: { minHz: 3000, maxHz: 20000 }, // Highs
};

// Onset detection config
const ONSET_PEAK_WINDOW = 3;   // ±3 frames for local maxima
const ONSET_THRESHOLD = 0.15;  // Minimum onset strength (after normalization) to survive peak-picking

// ============================================================
// WAV PARSER (simple, supports 16/24/32-bit PCM)
// ============================================================
function parseWav(buffer) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // RIFF header
    const riffId = String.fromCharCode(...buffer.slice(0, 4));
    if (riffId !== 'RIFF') throw new Error('Not a RIFF file');

    const waveId = String.fromCharCode(...buffer.slice(8, 12));
    if (waveId !== 'WAVE') throw new Error('Not a WAVE file');

    let offset = 12;
    let sampleRate, numChannels, bitsPerSample, dataBuffer;

    while (offset < buffer.length) {
        const chunkId = String.fromCharCode(...buffer.slice(offset, offset + 4));
        const chunkSize = view.getUint32(offset + 4, true);

        if (chunkId === 'fmt ') {
            const audioFormat = view.getUint16(offset + 8, true);
            numChannels = view.getUint16(offset + 10, true);
            sampleRate = view.getUint32(offset + 12, true);
            bitsPerSample = view.getUint16(offset + 22, true);
            console.log(`Format: ${numChannels}ch, ${sampleRate}Hz, ${bitsPerSample}-bit, format=${audioFormat}`);
        } else if (chunkId === 'data') {
            dataBuffer = buffer.slice(offset + 8, offset + 8 + chunkSize);
            break;
        }

        offset += 8 + chunkSize;
        if (chunkSize % 2 !== 0) offset++; // Padding byte
    }

    if (!dataBuffer) throw new Error('No data chunk found');

    // Convert to float mono
    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = dataBuffer.length / bytesPerSample;
    const framesCount = totalSamples / numChannels;
    const mono = new Float32Array(framesCount);
    const dv = new DataView(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.byteLength);

    for (let i = 0; i < framesCount; i++) {
        let sum = 0;
        for (let ch = 0; ch < numChannels; ch++) {
            const byteOffset = (i * numChannels + ch) * bytesPerSample;
            let sample;
            if (bitsPerSample === 16) {
                sample = dv.getInt16(byteOffset, true) / 32768;
            } else if (bitsPerSample === 24) {
                const b0 = dataBuffer[byteOffset];
                const b1 = dataBuffer[byteOffset + 1];
                const b2 = dataBuffer[byteOffset + 2];
                let val = (b2 << 16) | (b1 << 8) | b0;
                if (val & 0x800000) val |= ~0xFFFFFF; // Sign extend
                sample = val / 8388608;
            } else if (bitsPerSample === 32) {
                sample = dv.getInt32(byteOffset, true) / 2147483648;
            }
            sum += sample;
        }
        mono[i] = sum / numChannels;
    }

    return { samples: mono, sampleRate, duration: framesCount / sampleRate };
}

// ============================================================
// FFT (Cooley-Tukey radix-2)
// ============================================================
function fft(re, im) {
    const n = re.length;
    if (n <= 1) return;

    // Bit-reversal permutation
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            [re[i], re[j]] = [re[j], re[i]];
            [im[i], im[j]] = [im[j], im[i]];
        }
    }

    // Butterfly
    for (let len = 2; len <= n; len *= 2) {
        const half = len / 2;
        const angle = -2 * Math.PI / len;
        const wRe = Math.cos(angle);
        const wIm = Math.sin(angle);

        for (let i = 0; i < n; i += len) {
            let curRe = 1, curIm = 0;
            for (let j = 0; j < half; j++) {
                const tRe = curRe * re[i + j + half] - curIm * im[i + j + half];
                const tIm = curRe * im[i + j + half] + curIm * re[i + j + half];
                re[i + j + half] = re[i + j] - tRe;
                im[i + j + half] = im[i + j] - tIm;
                re[i + j] += tRe;
                im[i + j] += tIm;
                const newRe = curRe * wRe - curIm * wIm;
                curIm = curRe * wIm + curIm * wRe;
                curRe = newRe;
            }
        }
    }
}

function computeMagnitudes(samples, windowStart, fftSize) {
    const re = new Float64Array(fftSize);
    const im = new Float64Array(fftSize);

    // Apply Hann window
    for (let i = 0; i < fftSize; i++) {
        const idx = windowStart + i;
        const sample = idx < samples.length ? samples[idx] : 0;
        const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
        re[i] = sample * hann;
    }

    fft(re, im);

    // Compute magnitudes for positive frequencies only
    const mags = new Float64Array(fftSize / 2);
    for (let i = 0; i < fftSize / 2; i++) {
        mags[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / fftSize;
    }
    return mags;
}

// ============================================================
// ONSET DETECTION — spectral flux on low-band bins + peak picking
// ============================================================
function computeOnsets(allMags, lowMinBin, lowMaxBin, totalFrames) {
    // Step 1: Compute spectral flux (half-wave rectified) on low bins per frame
    const flux = new Float64Array(totalFrames);
    for (let f = 1; f < totalFrames; f++) {
        let sum = 0;
        for (let bin = lowMinBin; bin <= lowMaxBin; bin++) {
            const diff = allMags[f][bin] - allMags[f - 1][bin];
            if (diff > 0) sum += diff; // half-wave rectify: only positive increases
        }
        flux[f] = sum;
    }
    flux[0] = 0;

    // Step 2: Normalize flux to 0-1
    let maxFlux = 0;
    for (let f = 0; f < totalFrames; f++) {
        if (flux[f] > maxFlux) maxFlux = flux[f];
    }
    const normFlux = new Float64Array(totalFrames);
    for (let f = 0; f < totalFrames; f++) {
        normFlux[f] = maxFlux > 0 ? flux[f] / maxFlux : 0;
    }

    // Step 3: Peak picking — only keep local maxima within ±ONSET_PEAK_WINDOW frames
    // that are above ONSET_THRESHOLD
    const onsets = new Float64Array(totalFrames);
    for (let f = 0; f < totalFrames; f++) {
        const val = normFlux[f];
        if (val < ONSET_THRESHOLD) continue;

        let isMax = true;
        for (let w = -ONSET_PEAK_WINDOW; w <= ONSET_PEAK_WINDOW; w++) {
            if (w === 0) continue;
            const neighbor = f + w;
            if (neighbor >= 0 && neighbor < totalFrames && normFlux[neighbor] > val) {
                isMax = false;
                break;
            }
        }
        if (isMax) {
            onsets[f] = val; // Store raw onset strength, not binary
        }
    }

    return onsets;
}

// ============================================================
// MAIN
// ============================================================
function main() {
    console.log(`Reading: ${INPUT_WAV}`);
    const wavBuffer = fs.readFileSync(INPUT_WAV);
    const { samples, sampleRate, duration } = parseWav(wavBuffer);
    console.log(`Decoded: ${duration.toFixed(2)}s, ${sampleRate}Hz, ${samples.length} samples`);

    const binHz = sampleRate / FFT_SIZE;
    console.log(`FFT bin resolution: ${binHz.toFixed(1)}Hz`);

    // Compute bin ranges for each band
    const bandBins = {};
    for (const [name, { minHz, maxHz }] of Object.entries(BANDS)) {
        const minBin = Math.max(1, Math.floor(minHz / binHz));
        const maxBin = Math.min(FFT_SIZE / 2 - 1, Math.ceil(maxHz / binHz));
        bandBins[name] = { minBin, maxBin };
        console.log(`  ${name}: ${minHz}-${maxHz}Hz → bins ${minBin}-${maxBin}`);
    }

    const hopSize = Math.round(sampleRate / FPS);
    const totalFrames = Math.floor(duration * FPS);
    console.log(`Analyzing ${totalFrames} frames (hop=${hopSize} samples)...`);

    // First pass: compute raw band energies + store per-frame magnitudes for onset detection
    const rawFrames = [];
    const maxPerBand = { low: 0, mid: 0, high: 0 };
    const allMags = []; // Store all magnitude arrays for onset detection

    for (let frame = 0; frame < totalFrames; frame++) {
        const windowStart = frame * hopSize;
        const mags = computeMagnitudes(samples, windowStart, FFT_SIZE);
        allMags.push(mags);

        const bands = {};
        for (const [name, { minBin, maxBin }] of Object.entries(bandBins)) {
            let energy = 0;
            for (let bin = minBin; bin <= maxBin; bin++) {
                energy += mags[bin] * mags[bin]; // RMS-style
            }
            energy = Math.sqrt(energy / (maxBin - minBin + 1));
            bands[name] = energy;
            if (energy > maxPerBand[name]) maxPerBand[name] = energy;
        }
        rawFrames.push(bands);
    }

    // Compute low-band onsets
    console.log(`Computing low-band onsets (spectral flux + peak picking)...`);
    const lowOnsets = computeOnsets(
        allMags,
        bandBins.low.minBin,
        bandBins.low.maxBin,
        totalFrames
    );

    const onsetCount = lowOnsets.filter(v => v > 0).length;
    console.log(`  Found ${onsetCount} onsets (threshold=${ONSET_THRESHOLD}, window=±${ONSET_PEAK_WINDOW})`);

    // Second pass: normalize bands to 0-1 and merge with onsets
    const frames = rawFrames.map((bands, i) => ({
        low: Math.min(1, bands.low / (maxPerBand.low || 1)),
        mid: Math.min(1, bands.mid / (maxPerBand.mid || 1)),
        high: Math.min(1, bands.high / (maxPerBand.high || 1)),
        lowOnset: parseFloat(lowOnsets[i].toFixed(4)),
    }));

    // Write output
    const outDir = path.dirname(OUTPUT_JSON);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const output = {
        fps: FPS,
        duration,
        totalFrames: frames.length,
        bands: ['low', 'mid', 'high', 'lowOnset'],
        frames,
    };

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output));
    const sizeMB = (fs.statSync(OUTPUT_JSON).size / 1024 / 1024).toFixed(2);
    console.log(`\nWritten: ${OUTPUT_JSON} (${sizeMB}MB, ${frames.length} frames)`);

    // Print some stats
    const avgLow = frames.reduce((s, f) => s + f.low, 0) / frames.length;
    const avgMid = frames.reduce((s, f) => s + f.mid, 0) / frames.length;
    const avgHigh = frames.reduce((s, f) => s + f.high, 0) / frames.length;
    console.log(`\nAverage band levels:`);
    console.log(`  low:  ${avgLow.toFixed(3)}`);
    console.log(`  mid:  ${avgMid.toFixed(3)}`);
    console.log(`  high: ${avgHigh.toFixed(3)}`);
    console.log(`  onsets: ${onsetCount} events`);
}

main();
