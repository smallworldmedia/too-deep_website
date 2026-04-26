import * as THREE from 'three/webgpu';
import { color, time, oscSine, mix, float, sin, step } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Setup WebGPU Renderer
const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
// Soft fog to blend backgrounds
scene.fog = new THREE.FogExp2(0x1a1a1a, 0.05);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// ==========================================
// Lighting
// ==========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// Key light with sharp shadow (left)
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(-5, 8, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.bias = -0.0001;
scene.add(dirLight);

// Fill light (right)
const fillLight = new THREE.DirectionalLight(0xaaccff, 0.8);
fillLight.position.set(5, 5, 5);
scene.add(fillLight);

// ==========================================
// Interaction System
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickables = [];
let hoveredObj = null;

// Track pointer global to allow dragging out of bounds
let isPointerDown = false;

window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(clickables, true);

    // Manage hover states
    if (intersects.length > 0) {
        let root = intersects[0].object;
        while (root.parent && root.parent !== scene) root = root.parent; // find component root

        if (hoveredObj !== root) {
            if (hoveredObj && hoveredObj.userData.onHoverOut) hoveredObj.userData.onHoverOut();
            hoveredObj = root;
            if (hoveredObj && hoveredObj.userData.onHoverIn) hoveredObj.userData.onHoverIn();
        }
        document.body.style.cursor = 'pointer';
        controls.enabled = false; // Disable orbit if hovering components
    } else {
        if (!isPointerDown) {
            if (hoveredObj && hoveredObj.userData.onHoverOut) hoveredObj.userData.onHoverOut();
            hoveredObj = null;
            document.body.style.cursor = 'default';
            controls.enabled = true;
        }
    }

    // Trigger tick for dragging items
    if (isPointerDown && hoveredObj && hoveredObj.userData.onDrag) {
        hoveredObj.userData.onDrag(e.movementY);
    }
});

window.addEventListener('pointerdown', (e) => {
    isPointerDown = true;
    if (hoveredObj && hoveredObj.userData.onPointerDown) {
        hoveredObj.userData.onPointerDown();
    }
});

window.addEventListener('pointerup', (e) => {
    isPointerDown = false;
    if (hoveredObj && hoveredObj.userData.onPointerUp) {
        hoveredObj.userData.onPointerUp();
    }
});

// ==========================================
// Layout Anchor
// ==========================================
// We'll place components side by side on a presentation "table"
const tableGeo = new THREE.PlaneGeometry(30, 20);
const tableMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.8,
    metalness: 0.1
});
const table = new THREE.Mesh(tableGeo, tableMat);
table.rotation.x = -Math.PI / 2;
table.receiveShadow = true;
scene.add(table);

// ==========================================
// COMPONENT 1: Play Button
// ==========================================
function createPlayButton() {
    const group = new THREE.Group();
    group.position.set(-3, 0, 0);

    // Base casing
    const baseGeo = new THREE.BoxGeometry(2, 0.4, 2);
    const baseMat = new THREE.MeshStandardNodeMaterial({
        color: 0x111111,
        roughness: 0.7,
        metalness: 0.3
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Actuator button
    const btnGeo = new THREE.BoxGeometry(1.6, 0.3, 1.6);
    // TSL glow element: glowing cyan base that pulses slightly
    const btnMat = new THREE.MeshStandardNodeMaterial({
        color: 0x333333,
        roughness: 0.3,
        metalness: 0.7
    });
    const btnMesh = new THREE.Mesh(btnGeo, btnMat);
    btnMesh.position.y = 0.5; // Top of base
    btnMesh.castShadow = true;
    baseMesh.add(btnMesh);

    // Play symbol
    const symbolShape = new THREE.Shape();
    symbolShape.moveTo(-0.2, 0.3);
    symbolShape.lineTo(0.3, 0);
    symbolShape.lineTo(-0.2, -0.3);
    symbolShape.closePath();
    const extrudeSettings = { depth: 0.05, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 0.02, bevelThickness: 0.02 };
    const symbolGeo = new THREE.ExtrudeGeometry(symbolShape, extrudeSettings);

    const symbolMat = new THREE.MeshPhysicalNodeMaterial({
        color: 0xffffff,
        emissiveNode: color(0x00ffcc).mul(mix(0.1, 1.0, oscSine(time.mul(2)))), // TSL pulsing
        roughness: 0.1,
        metalness: 0.1,
        clearcoat: 1.0,
        transmission: 0.5 // looks glassy
    });
    const symbolMesh = new THREE.Mesh(symbolGeo, symbolMat);
    symbolMesh.rotation.x = Math.PI / 2;
    symbolMesh.position.set(0, 0.15, 0);
    btnMesh.add(symbolMesh);

    // Interaction logic
    group.userData = {
        isDown: false,
        onHoverIn: () => { btnMat.colorNode = color(0x555555); },
        onHoverOut: () => { if (!group.userData.isDown) btnMat.colorNode = color(0x333333); },
        onPointerDown: () => {
            group.userData.isDown = true;
            btnMesh.position.y = 0.4; // pressed down
            symbolMat.emissiveNode = color(0x00ffcc).mul(3.0); // Boost glow
        },
        onPointerUp: () => {
            group.userData.isDown = false;
            btnMesh.position.y = 0.5; // released
            symbolMat.emissiveNode = color(0x00ffcc).mul(mix(0.1, 1.0, oscSine(time.mul(2))));
        }
    };

    clickables.push(group);
    scene.add(group);
}
createPlayButton();

// ==========================================
// COMPONENT 2: Sub Knob
// ==========================================
function createSubKnob() {
    const group = new THREE.Group();
    group.position.set(0, 0, 0);

    // Inner dial / post
    const baseGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 32);
    const baseMat = new THREE.MeshStandardNodeMaterial({ color: 0x111111, roughness: 0.9 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.1;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // The Knob
    const knobGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.8, 64);
    const knobMat = new THREE.MeshStandardNodeMaterial({
        color: 0x444444, // Brushed metal look
        roughness: 0.4,
        metalness: 0.9,
    });

    const knobMesh = new THREE.Mesh(knobGeo, knobMat);
    knobMesh.position.y = 0.6;
    knobMesh.castShadow = true;
    knobMesh.receiveShadow = true;
    group.add(knobMesh);

    // Indicator mark
    const markGeo = new THREE.BoxGeometry(0.1, 0.82, 0.4);
    const markMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const markMesh = new THREE.Mesh(markGeo, markMat);
    markMesh.position.set(0, 0, 0.7); // On the edge pointing +Z
    knobMesh.add(markMesh);

    // Interaction
    let currentRot = 0;
    group.userData = {
        onHoverIn: () => { knobMat.emissiveNode = color(0x222222); },
        onHoverOut: () => { knobMat.emissiveNode = color(0x000000); },
        onDrag: (movementY) => {
            // Mouse Y changes rotation
            currentRot -= movementY * 0.05;
            // Clamp roughly 270 degrees sweep
            const max = Math.PI * 0.8;
            currentRot = Math.max(-max, Math.min(max, currentRot));
            knobMesh.rotation.y = currentRot;
        }
    };

    clickables.push(group);
    scene.add(group);
}
createSubKnob();

// ==========================================
// COMPONENT 3: Pre-Save Button
// ==========================================
function createPreSaveButton() {
    const group = new THREE.Group();
    group.position.set(3, 0, 0);

    const btnWidth = 2.5;
    const btnHeight = 0.5;
    const btnDepth = 1.0;

    // We can use a BoxGeometry with some bevel for a pill-like look
    const btnGeo = new THREE.BoxGeometry(btnWidth, btnHeight, btnDepth);

    const btnMat = new THREE.MeshPhysicalNodeMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.1,
        transmission: 0.9, // high transmission = glass/silicon
        thickness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });

    const btnMesh = new THREE.Mesh(btnGeo, btnMat);
    btnMesh.position.y = 0.25;
    btnMesh.castShadow = true;
    group.add(btnMesh);

    // Inner glowing core that responds to TSL Time
    const coreGeo = new THREE.BoxGeometry(btnWidth * 0.8, btnHeight * 0.5, btnDepth * 0.6);
    const coreMat = new THREE.MeshBasicNodeMaterial({
        color: 0x0066ff
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    btnMesh.add(coreMesh);

    group.userData = {
        isDown: false,
        onHoverIn: () => {
            coreMat.colorNode = color(0x00ccff).mul(mix(0.8, 1.2, oscSine(time.mul(5))));
        },
        onHoverOut: () => {
            coreMat.colorNode = color(0x0066ff);
        },
        onPointerDown: () => {
            btnMesh.position.y = 0.15;
            coreMat.colorNode = color(0xffffff).mul(2.0); // flash white
        },
        onPointerUp: () => {
            btnMesh.position.y = 0.25;
            coreMat.colorNode = color(0x00ccff).mul(mix(0.8, 1.2, oscSine(time.mul(5))));
        }
    };

    clickables.push(group);
    scene.add(group);
}
createPreSaveButton();

// ==========================================
// Main Render Loop
// ==========================================
async function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Required for TSL to function
    await renderer.renderAsync(scene, camera);
}

// Start rendering after init
renderer.init().then(animate);

// Resize handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
