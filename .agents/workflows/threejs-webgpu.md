---
description: Comprehensive guide for developing WebGPU-enabled Three.js applications using TSL (Three.js Shading Language). Covers WebGPU renderer setup, TSL syntax and node materials, compute shaders, post-processing effects, and WGSL integration. Use this skill when working with Three.js WebGPU, TSL shaders, node materials, or GPU compute in Three.js.
---

1. Read the main WebGPU/TSL skill entry point:
   - `view_file .agents/skills/webgpu-threejs-tsl/SKILL.md`

2. Read the quick reference cheatsheet:
   - `view_file .agents/skills/webgpu-threejs-tsl/REFERENCE.md`

3. Read the relevant docs based on the task:
   - Core concepts (types, operators, uniforms, control flow): `view_file .agents/skills/webgpu-threejs-tsl/docs/core-concepts.md`
   - Node materials: `view_file .agents/skills/webgpu-threejs-tsl/docs/materials.md`
   - Compute shaders: `view_file .agents/skills/webgpu-threejs-tsl/docs/compute-shaders.md`
   - Post-processing effects: `view_file .agents/skills/webgpu-threejs-tsl/docs/post-processing.md`
   - Custom WGSL integration: `view_file .agents/skills/webgpu-threejs-tsl/docs/wgsl-integration.md`
   - Device loss handling: `view_file .agents/skills/webgpu-threejs-tsl/docs/device-loss.md`

4. Reference the example files for working patterns:
   - Basic setup: `.agents/skills/webgpu-threejs-tsl/examples/basic-setup.js`
   - Custom material: `.agents/skills/webgpu-threejs-tsl/examples/custom-material.js`
   - Particle system: `.agents/skills/webgpu-threejs-tsl/examples/particle-system.js`
   - Post-processing: `.agents/skills/webgpu-threejs-tsl/examples/post-processing.js`
   - Earth shader: `.agents/skills/webgpu-threejs-tsl/examples/earth-shader.js`

5. Use starter templates if creating from scratch:
   - WebGPU project: `.agents/skills/webgpu-threejs-tsl/templates/webgpu-project.js`
   - Compute shader: `.agents/skills/webgpu-threejs-tsl/templates/compute-shader.js`

6. Key implementation notes:
   - Import from `three/webgpu` instead of `three`
   - Import TSL nodes from `three/tsl`
   - `await renderer.init()` is required before first render
   - Target Three.js r171+ for stable TSL API
   - Browser support: Chrome 113+, Edge 113+

7. Verify the WebGPU scene renders correctly in the browser.
