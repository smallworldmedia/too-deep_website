/**
 * Scene setup — fullscreen quad with base composition shader
 */
import * as THREE from 'three';
import baseVert from './shaders/base.vert';
import baseFrag from './shaders/base.frag';
import { createTitleTexture, createArtistTexture } from './textRenderer.js';

export function createScene(renderer) {
    const scene = new THREE.Scene();
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Orthographic camera for fullscreen 2D
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    camera.position.z = 1;

    // Generate text textures
    const title = createTitleTexture(w, h);
    const artist = createArtistTexture(w, h);


    // Fullscreen quad material
    const uniforms = {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(w, h) },
        uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
        uTitleTexture: { value: title.texture },
        uArtistTexture: { value: artist.texture },
        uTitleOpacity: { value: 0.0 },
        uTitleScale: { value: 0.96 },
        uArtistOpacity: { value: 0.0 },
        uArtistScale: { value: 0.96 },
    };

    const material = new THREE.ShaderMaterial({
        vertexShader: baseVert,
        fragmentShader: baseFrag,
        uniforms,
        // Using GLSL1 for compatibility (varying/gl_FragColor/texture2D)
    });

    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    function onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        uniforms.uResolution.value.set(w, h);

        // Regenerate text textures at new size
        const newTitle = createTitleTexture(w, h);
        const newArtist = createArtistTexture(w, h);

        uniforms.uTitleTexture.value.dispose();
        uniforms.uArtistTexture.value.dispose();
        uniforms.uTitleTexture.value = newTitle.texture;
        uniforms.uArtistTexture.value = newArtist.texture;
    }

    return { scene, camera, uniforms, mesh, material, onResize };
}
