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
        const pivot = bassKnob3.querySelector('.sub-knob-pivot');
        const ring = bassKnob3.parentElement.querySelector('.ring-lit');
        let isDragging3 = false;
        let startY3 = 0;
        let currentRotation3 = parseInt(bassKnob3.dataset.rotation || 210);

        pivot.style.transform = `rotate(${currentRotation3}deg)`;
        ring.style.setProperty('--fill-angle', `${currentRotation3 - 210}deg`);

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

            pivot.style.transform = `rotate(${currentRotation3}deg)`;
            ring.style.setProperty('--fill-angle', `${currentRotation3 - 210}deg`);
            bassKnob3.dataset.rotation = currentRotation3;
            startY3 = e.clientY;

            if (currentRotation3 > 215) {
                ring.classList.add('glow-on');
                ring.classList.remove('glow-off');
                bassLabel3.classList.add('glow-on');
                bassLabel3.classList.remove('glow-off');
            } else {
                ring.classList.add('glow-off');
                ring.classList.remove('glow-on');
                bassLabel3.classList.add('glow-off');
                bassLabel3.classList.remove('glow-on');
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging3 = false;
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
