// JavaScript for interactivity
document.addEventListener('DOMContentLoaded', () => {
    console.log('Iteration environment ready.');

    // 1. Knob Rotation
    const knobs = document.querySelectorAll('.knob-element');
    knobs.forEach(knob => {
        const pivot = knob.querySelector('.knob-pivot');
        let isDragging = false;
        let startY = 0;
        let currentRotation = parseFloat(knob.dataset.rotation || 0);

        pivot.style.transform = `rotate(${currentRotation}deg)`;

        knob.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevents text selection from initiating
            isDragging = true;
            startY = e.clientY;
            document.body.style.cursor = 'ns-resize';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaY = startY - e.clientY;
            currentRotation += deltaY * 1.5; // multiplier for speed

            if (currentRotation > 135) currentRotation = 135;
            if (currentRotation < -135) currentRotation = -135;

            pivot.style.transform = `rotate(${currentRotation}deg)`;
            knob.dataset.rotation = currentRotation;
            startY = e.clientY;
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        });
    });

    // 2. Play Button toggles
    const siliconBtns = document.querySelectorAll('.silicon-button');
    siliconBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('glow-on');
        });
    });

    // 3. Sub Knob Logic
    const bassKnob = document.getElementById('bass-knob');
    const bassLabel = document.getElementById('bass-label');
    if (bassKnob && bassLabel) {
        const pivot = bassKnob.querySelector('.sub-knob-pivot');
        const dot = pivot.querySelector('.knob-led-dot');
        let isDraggingBass = false;
        let startYBass = 0;
        let currentRotationBass = parseInt(bassKnob.dataset.rotation || 180);

        // Setup initial rotation
        pivot.style.transform = `rotate(${currentRotationBass}deg)`;

        bassKnob.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevents text selection from initiating
            isDraggingBass = true;
            startYBass = e.clientY;
            document.body.style.cursor = 'ns-resize';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingBass) return;
            const deltaY = startYBass - e.clientY;
            // Up generates positive deltaY, moving knob clockwise
            currentRotationBass += deltaY * 2.0;

            // Clamp rotation bounds: 180 (6:00) to 480 (4:00) => 300 deg travel
            if (currentRotationBass > 480) currentRotationBass = 480;
            if (currentRotationBass < 180) currentRotationBass = 180;

            pivot.style.transform = `rotate(${currentRotationBass}deg)`;
            bassKnob.dataset.rotation = currentRotationBass;
            startYBass = e.clientY;

            // Handle glowing logic
            // Only glow if it's confidently off 0 (180deg)
            if (currentRotationBass > 185) {
                dot.classList.add('glow-on');
                dot.classList.remove('glow-off');
                bassLabel.classList.add('glow-on');
                bassLabel.classList.remove('glow-off');
            } else {
                dot.classList.add('glow-off');
                dot.classList.remove('glow-on');
                bassLabel.classList.add('glow-off');
                bassLabel.classList.remove('glow-on');
            }
        });

        window.addEventListener('mouseup', () => {
            isDraggingBass = false;
            document.body.style.cursor = 'default';
        });
    }

    // 4. Sub Knob Variant 3 (Segmented Ring LED)
    const bassKnob3 = document.getElementById('bass-knob-3');
    const bassLabel3 = document.getElementById('bass-label-3');
    if (bassKnob3 && bassLabel3) {
        const pivots = bassKnob3.querySelectorAll('.sub-knob-pivot, .sub-knob-pivot-notch');
        const ringOuter = document.getElementById('bass-ring-3');
        const notchElement = bassKnob3.querySelector('.knob-embossed-notch');
        let isDragging3 = false;
        let startY3 = 0;
        let currentRotation3 = parseInt(bassKnob3.dataset.rotation || 210);

        // Generate LED segments dynamically
        ringOuter.innerHTML = '';
        const numSegments = 26; // 0 to 26 = 27 segments
        const segmentsArray = [];
        for (let i = 0; i <= numSegments; i++) {
            const segContainer = document.createElement('div');
            segContainer.style.position = 'absolute';
            segContainer.style.top = '50%';
            segContainer.style.left = '50%';
            segContainer.style.transformOrigin = 'bottom center';
            segContainer.style.height = '47px';
            segContainer.style.width = '6px';
            segContainer.style.marginLeft = '-3px';
            segContainer.style.marginTop = '-47px';

            const angle = 210 + (300 / numSegments) * i;
            segContainer.style.transform = `rotate(${angle}deg)`;

            const led = document.createElement('div');
            led.className = 'led-segment-notch';
            const progress = i / numSegments;
            led.style.setProperty('--seg-clr', `hsl(${220 - 50 * progress}, 100%, 50%)`);
            segContainer.appendChild(led);

            ringOuter.appendChild(segContainer);
            segmentsArray.push({ angle, el: led });
        }

        pivots.forEach(p => p.style.transform = `rotate(${currentRotation3}deg)`);

        function updateRing(rot) {
            segmentsArray.forEach(seg => {
                // Prevent bottom-most LED from rendering when at true zero off state
                if (rot > 212 && seg.angle <= rot + 2) {
                    seg.el.classList.add('active');
                } else {
                    seg.el.classList.remove('active');
                }
            });
            // Update physical notch glow and BASS text glow
            if (rot > 215) {
                notchElement.classList.add('glow-on');
                notchElement.classList.remove('glow-off');
                bassLabel3.classList.add('glow-on');
                bassLabel3.classList.remove('glow-off');
            } else {
                notchElement.classList.add('glow-off');
                notchElement.classList.remove('glow-on');
                bassLabel3.classList.add('glow-off');
                bassLabel3.classList.remove('glow-on');
            }
        }

        updateRing(currentRotation3);

        bassKnob3.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging3 = true;
            startY3 = e.clientY;
            document.body.style.cursor = 'ns-resize';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging3) return;
            const deltaY = startY3 - e.clientY;
            currentRotation3 += deltaY * 2.0;

            if (currentRotation3 > 510) currentRotation3 = 510;
            if (currentRotation3 < 210) currentRotation3 = 210;

            pivots.forEach(p => p.style.transform = `rotate(${currentRotation3}deg)`);
            bassKnob3.dataset.rotation = currentRotation3;
            startY3 = e.clientY;

            updateRing(currentRotation3);
        });

        window.addEventListener('mouseup', () => {
            isDragging3 = false;
            document.body.style.cursor = 'default';
        });
    }

    // 5. Mobile Fader Variant 3 (Segmented Vertical LED)
    const faderHandle3 = document.getElementById('fader-handle-3');
    const faderTrack3 = document.getElementById('fader-track-3');
    const faderLeds3 = document.getElementById('fader-leds-3');
    const faderLabel3 = document.getElementById('fader-label-3');
    if (faderHandle3 && faderTrack3) {
        const faderNotch = faderHandle3.querySelector('.fader-embossed-notch');
        let isDraggingFader = false;
        let startYFader = 0;
        let currentYVal = 156; // 156px = bottom = 0%, 0 = top = 100%
        const maxTravel = 156;

        // Generate LED segments statically spaced along the 156px physical travel length
        faderLeds3.innerHTML = '';
        const numFaderSegments = 16;
        const faderSegmentsArray = [];
        for (let i = 0; i <= numFaderSegments; i++) {
            const led = document.createElement('div');
            led.className = 'led-segment-notch fader-led-notch';
            const progress = i / numFaderSegments; // 0 = Bottom, 1 = Top

            // Thumb goes from top 0 to 156px. Notch is centered at 12px on the 24px thumb.
            // Map exact center to align with node physical travel bound.
            const targetLedY = 168 - (progress * 156) - 1.25;
            led.style.top = `${targetLedY}px`;
            led.style.setProperty('--seg-clr', `hsl(${220 - 50 * progress}, 100%, 50%)`);
            faderLeds3.appendChild(led);

            const requiredThumbY = 156 - (progress * 156);
            faderSegmentsArray.push({ requiredThumbY: requiredThumbY, el: led });
        }

        function updateFader(yPos) {
            faderSegmentsArray.forEach(seg => {
                // Completely blackout nodes at 156 drag threshold (zero point)
                if (yPos < 154 && yPos <= seg.requiredThumbY + 2) {
                    seg.el.classList.add('active');
                } else {
                    seg.el.classList.remove('active');
                }
            });
            if (yPos < 154) {
                faderNotch.classList.add('glow-on');
                faderNotch.classList.remove('glow-off');
                faderLabel3.classList.add('glow-on');
                faderLabel3.classList.remove('glow-off');
            } else {
                faderNotch.classList.add('glow-off');
                faderNotch.classList.remove('glow-on');
                faderLabel3.classList.add('glow-off');
                faderLabel3.classList.remove('glow-on');
            }
            faderHandle3.style.top = `${yPos}px`;
        }
        updateFader(currentYVal);

        faderHandle3.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDraggingFader = true;
            startYFader = e.clientY;
            document.body.style.cursor = 'ns-resize';
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDraggingFader) return;
            const deltaY = e.clientY - startYFader;
            currentYVal += deltaY;

            if (currentYVal > 156) currentYVal = 156;
            if (currentYVal < 0) currentYVal = 0;

            updateFader(currentYVal);
            startYFader = e.clientY;
        });
        window.addEventListener('mouseup', () => {
            isDraggingFader = false;
            document.body.style.cursor = 'default';
        });
    }
});

// Tape Deck Interlocking Logic
function setupTapeDeckLogic(playId, pauseId) {
    const playBtn = document.getElementById(playId);
    const pauseBtn = document.getElementById(pauseId);

    if (playBtn && pauseBtn) {
        // Play button click: Depress play, pop up pause
        playBtn.addEventListener('click', () => {
            playBtn.classList.add('pressed');
            pauseBtn.classList.remove('pressed');
        });

        // Pause button click: Depress pause, pop up play
        pauseBtn.addEventListener('click', () => {
            pauseBtn.classList.add('pressed');
            playBtn.classList.remove('pressed');
        });
    }
}

// Setup both variations
setupTapeDeckLogic('tape-play-1', 'tape-pause-1');
setupTapeDeckLogic('tape-play-2', 'tape-pause-2');
setupTapeDeckLogic('tape-play-3', 'tape-pause-3');

// Pre-save button: independent toggle (not interlocked with play/pause)
const presaveBtn = document.getElementById('tape-presave-3');
if (presaveBtn) {
    presaveBtn.addEventListener('click', () => {
        presaveBtn.classList.toggle('pressed');
    });
}
