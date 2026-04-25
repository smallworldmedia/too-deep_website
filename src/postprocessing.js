/**
 * Post-processing chain — fog, bloom, caustics, water ripple, final bloom
 * Each effect is a custom ShaderPass adapted from the Unicorn Studio JSON
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ============================================================
// FOG SHADER — FBM noise based atmospheric fog
// ============================================================
const FogShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
    uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMousePos;
    varying vec2 vUv;

    const float PHI = 1.618033988;
    const float PI = 3.14159265359;

    mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

    float dot_noise(vec3 p) {
      const mat3 GOLD = mat3(
        -0.571464913, 0.814921382, 0.096597072,
        -0.278044873, -0.303026659, 0.911518454,
        0.772087367, 0.494042493, 0.399753815);
      return dot(cos(GOLD * p), sin(PHI * p * GOLD));
    }

    float cheap_fbm(vec3 p) {
      mat2 rota = mat2(0.6, -0.8, 0.8, 0.6);
      float nos = 0.0;
      float amp = 1.0 + 0.22 * 10.0;
      float xp = sqrt(2.0);
      float halfxp = xp * 0.5;
      for (int i = 0; i < FBM_ITERS; i++) {
        float theta = uTime * 0.05 + float(i);
        p.xy *= xp;
        p.xy += sin(rota * p.xy * xp + theta) * 0.2;
        float nz = dot_noise(vec3(p.xy * rota, p.z + theta));
        nos += nz * amp * rota[0][0];
        amp *= halfxp;
        rota *= mat2(0.6, -0.8, 0.8, 0.6);
      }
      nos *= 1.0 / 3.0;
      float density = -3.0 + 0.5 * 6.0;
      return smoothstep(-3.0, 3.0, nos + density);
    }

    float fnoise(vec2 uv) {
      float aspectRatio = uResolution.x / uResolution.y;
      vec2 aspect = vec2(aspectRatio, 1.0);
      float multiplier = 10.0 * (0.85 / ((aspectRatio + 1.0) / 2.0));
      vec2 st = ((uv * aspect - vec2(0.5) * aspect)) * multiplier * rot(0.2889 * 2.0 * PI);
      float time = uTime * 0.05;
      vec2 drift = vec2(time * 0.2) * 2.0 * 0.29 * rot(0.125 * 2.0 * PI);
      float fbm = cheap_fbm(vec3(st - drift, time));
      fbm = fbm / (1.0 + fbm);
      return fbm;
    }

    // Simple hash random (GLSL1 compatible)
    float randFibo(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float interleavedGradientNoise(vec2 st) {
      return fract(52.9829189 * fract(dot(st, vec2(0.06711056, 0.00583715))));
    }

    void main() {
      vec2 uv = vUv;
      float fogNoise = fnoise(uv);
      float fogMask = clamp(fogNoise * 2.0, 0.0, 1.0);
      vec4 bg = texture2D(tDiffuse, uv);

      if (fogMask <= 0.001) {
        gl_FragColor = bg;
        return;
      }

      // Slight blur via jitter sampling — reduced radius to prevent text ghosting
      float ign = interleavedGradientNoise(gl_FragCoord.xy) - 0.5;
      vec2 texel = 1.0 / uResolution;
      float blurStrength = 0.04;
      float radius = blurStrength * 60.0 * fogNoise;
      vec2 at = (radius / uResolution) * vec2(1.0, uResolution.x / uResolution.y);

      vec4 blur = vec4(0.0);
      blur += texture2D(tDiffuse, uv + vec2(at.x, 0.0)) * 0.125;
      blur += texture2D(tDiffuse, uv - vec2(at.x, 0.0)) * 0.125;
      blur += texture2D(tDiffuse, uv + vec2(0.0, at.y)) * 0.125;
      blur += texture2D(tDiffuse, uv - vec2(0.0, at.y)) * 0.125;
      blur += texture2D(tDiffuse, uv + at) * 0.125;
      blur += texture2D(tDiffuse, uv - at) * 0.125;
      blur += texture2D(tDiffuse, uv + vec2(at.x, -at.y)) * 0.125;
      blur += texture2D(tDiffuse, uv + vec2(-at.x, at.y)) * 0.125;

      // Chromatic aberration — reduced to match softer blur
      vec2 offset = normalize(uv - 0.5) * fogMask * 0.01 * 0.04 * 0.075;
      blur.r = texture2D(tDiffuse, uv + offset).r * fogMask + blur.r * (1.0 - fogMask);
      blur.b = texture2D(tDiffuse, uv - offset).b * fogMask + blur.b * (1.0 - fogMask);

      // Grain + fog tint
      vec3 grain = vec3(randFibo(uv + fogNoise));
      blur.rgb = (blur.rgb * 1.37) + grain * 0.05;
      vec3 fogTint = vec3(0.639, 0.647, 0.682);
      vec4 foggedBlur = vec4(blur.rgb * fogTint, 1.0);
      foggedBlur.rgb += 0.61 * 0.25 * fogMask * fogTint;
      foggedBlur = mix(bg, foggedBlur, fogMask);

      gl_FragColor = foggedBlur;
    }
  `,
};

// ============================================================
// BLOOM SHADER — simple threshold + blur + composite
// ============================================================
const BloomShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2() },
    uAudioHigh: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uAudioHigh;
    varying vec2 vUv;

    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    float interleavedGradientNoise(vec2 st) {
      return fract(52.9829189 * fract(dot(st, vec2(0.06711056, 0.00583715))));
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float aspectRatio = uResolution.x / uResolution.y;

      // Threshold
      vec3 thresholded = pow(color.rgb, vec3(1.0/2.2));
      thresholded = 1.2 * (thresholded - 0.5) + 0.5;
      float l = luma(thresholded);
      vec3 bloom = thresholded * smoothstep(0.45, 0.55, l);

      // Blur
      vec3 blurred = vec3(0.0);
      float total = 0.0;
      for (int x = -BLOOM_RADIUS; x <= BLOOM_RADIUS; x++) {
        for (int y = -BLOOM_RADIUS; y <= BLOOM_RADIUS; y++) {
          float weight = exp(-0.5 * float(x*x + y*y) / 4.0);
          vec2 offset = vec2(float(x), float(y)) * 2.0 / uResolution;
          offset.x /= aspectRatio;
          vec4 s = texture2D(tDiffuse, vUv + offset);
          vec3 st = pow(s.rgb, vec3(1.0/2.2));
          st = 1.2 * (st - 0.5) + 0.5;
          float sl = luma(st);
          blurred += st * smoothstep(0.45, 0.55, sl) * weight;
          total += weight;
        }
      }
      blurred /= total;

      // Tint and composite
      float nx = interleavedGradientNoise(gl_FragCoord.xy) - 0.5;
      blurred *= vec3(0.094, 0.325, 0.349);
      vec4 finalColor = mix(color, color + vec4(blurred, 0.0), 0.525);

      // Lightweight bloom contribution (no second pass)
      vec3 bloom2 = blurred * 0.5;

      // Dither (GLSL1 compatible)
      float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;

      float bloomBoost = 0.874 + uAudioHigh * 0.3;
      vec4 result = mix(finalColor, finalColor + vec4(bloom2 * bloomBoost, luma(bloom2)), bloomBoost);
      result.rgb += dither;

      // Exposure lift + gamma correction — compensates for removed 2nd bloom pass
      // Lands between original brightness and the darker moody vibe
      result.rgb *= 1.19;
      result.rgb = pow(result.rgb, vec3(1.2));

      gl_FragColor = result;
    }
  `,
};

// ============================================================
// CAUSTICS SHADER — BCC noise-based underwater caustics
// ============================================================
const CausticsShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
    uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMousePos;
    varying vec2 vUv;

    const float PI = 3.14159265359;

    vec4 permute(vec4 t) { return t * (t * 34.0 + 133.0); }

    vec3 grad(float hash) {
      vec3 cube = mod(floor(hash / vec3(1.0, 2.0, 4.0)), 2.0) * 2.0 - 1.0;
      vec3 cuboct = cube;
      float index0 = step(0.0, 1.0 - floor(hash / 16.0));
      float index1 = step(0.0, floor(hash / 16.0) - 1.0);
      cuboct.x *= 1.0 - index0;
      cuboct.y *= 1.0 - index1;
      cuboct.z *= 1.0 - (1.0 - index0 - index1);
      float type = mod(floor(hash / 8.0), 2.0);
      vec3 rhomb = (1.0 - type) * cube + type * (cuboct + cross(cube, cuboct));
      return (cuboct * 1.22474487139 + rhomb) * (1.0 - 0.042942436724648037 * type) * 3.5946317686139184;
    }

    vec4 bccNoiseDerivativesPart(vec3 X) {
      vec3 b = floor(X);
      vec4 i4 = vec4(X - b, 2.5);
      vec3 v1 = b + floor(dot(i4, vec4(0.25)));
      vec3 v2 = b + vec3(1,0,0) + vec3(-1,1,1) * floor(dot(i4, vec4(-0.25,0.25,0.25,0.35)));
      vec3 v3 = b + vec3(0,1,0) + vec3(1,-1,1) * floor(dot(i4, vec4(0.25,-0.25,0.25,0.35)));
      vec3 v4 = b + vec3(0,0,1) + vec3(1,1,-1) * floor(dot(i4, vec4(0.25,0.25,-0.25,0.35)));
      vec4 hashes = permute(mod(vec4(v1.x,v2.x,v3.x,v4.x), 289.0));
      hashes = permute(mod(hashes + vec4(v1.y,v2.y,v3.y,v4.y), 289.0));
      hashes = mod(permute(mod(hashes + vec4(v1.z,v2.z,v3.z,v4.z), 289.0)), 48.0);
      vec3 d1=X-v1, d2=X-v2, d3=X-v3, d4=X-v4;
      vec4 a = max(0.75 - vec4(dot(d1,d1),dot(d2,d2),dot(d3,d3),dot(d4,d4)), 0.0);
      vec4 aa = a*a, aaaa = aa*aa;
      vec3 g1=grad(hashes.x), g2=grad(hashes.y), g3=grad(hashes.z), g4=grad(hashes.w);
      vec4 extrapolations = vec4(dot(d1,g1),dot(d2,g2),dot(d3,g3),dot(d4,g4));
      vec4 aae = aa*a*extrapolations;
      vec3 derivative = -8.0 * (d1*aae.x + d2*aae.y + d3*aae.z + d4*aae.w);
      derivative += g1*aaaa.x + g2*aaaa.y + g3*aaaa.z + g4*aaaa.w;
      return vec4(derivative, dot(aaaa, extrapolations));
    }

    vec4 bccNoise(vec3 X) {
      mat3 orthonormalMap = mat3(
        0.788675134594813, -0.211324865405187, -0.577350269189626,
        -0.211324865405187, 0.788675134594813, -0.577350269189626,
        0.577350269189626, 0.577350269189626, 0.577350269189626);
      X = orthonormalMap * X;
      vec4 result = bccNoiseDerivativesPart(X) + bccNoiseDerivativesPart(X + 144.5);
      return vec4(result.xyz * orthonormalMap, result.w);
    }

    vec4 getNoise(vec3 p) {
      vec4 noise = bccNoise(p);
      return mix(noise, (noise + 0.5) * 0.5, 0.16);
    }

    mat2 rotate2d(float angle) { return mat2(cos(angle),-sin(angle),sin(angle),cos(angle)); }

    // Color burn blend
    vec3 colorBurn(vec3 src, vec3 dst) {
      return vec3(
        (src.x == 0.0) ? 0.0 : (1.0 - ((1.0 - dst.x) / src.x)),
        (src.y == 0.0) ? 0.0 : (1.0 - ((1.0 - dst.y) / src.y)),
        (src.z == 0.0) ? 0.0 : (1.0 - ((1.0 - dst.z) / src.z))
      );
    }

    void main() {
      vec2 uv = vUv;
      vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

      // Caustic drift — slow bottom-left to upper-right current
      float driftSpeed = uTime * 0.015;
      vec2 drift = vec2(driftSpeed * 0.3, driftSpeed * 0.4);
      vec2 pos = vec2(0.5, 0.5) + drift;
      vec2 cuv = uv - pos;
      cuv = cuv * aspect * rotate2d(0.0891 * 2.0 * PI) * vec2(1.0 - 0.52, 1.0) * 16.0 * 0.71;
      vec3 p = vec3(cuv, uTime * 0.05);

      // Mouse proximity — subtle intensity increase near cursor, but caustics ALWAYS visible
      float mDist = max(0.0, 1.0 - distance(uv * aspect, uMousePos * aspect) * 6.0 * (1.0 - 0.86));
      // Soft cubic falloff instead of harsh exponential
      mDist = mDist * mDist * (3.0 - 2.0 * mDist);

      // Base caustic intensity — mouse proximity only
      float causticIntensity = 1.0 + mDist * 0.35;

      vec4 causticNoise = getNoise(p) * causticIntensity;

      #ifdef MOBILE
        // Single-pass caustics — skip double refraction to save GPU
        float normalized = pow(0.5 + 0.5 * causticNoise.w, 2.0);
        vec3 causticColor = vec3(0.792, 0.914, 0.933) * (normalized + 0.2 * (1.0 - normalized));
        causticColor *= causticIntensity;
      #else
        // Double refraction for complexity
        float refraction = mix(0.25, 1.3, 1.0);
        vec4 balanceNoise = getNoise(p - vec3(causticNoise.xyz / 32.0) * refraction);
        vec4 noise2 = getNoise(p - vec3(balanceNoise.xyz / 16.0) * refraction);
        float balancer = 0.5 + 0.5 * balanceNoise.w;
        float normalized = pow(0.5 + 0.5 * noise2.w, 2.0);
        vec3 causticColor = vec3(0.792, 0.914, 0.933) * mix(0.0, normalized + 0.2 * (1.0 - normalized), balancer);
        causticColor *= causticIntensity;
      #endif

      vec4 color = texture2D(tDiffuse, uv + causticNoise.xy * 0.01 * 0.21);
      vec3 blended = colorBurn(color.rgb, causticColor);
      color.rgb = mix(color.rgb, blended, 0.63);

      gl_FragColor = color;
    }
  `,
};

// ============================================================
// WATER RIPPLE SHADER — interactive refraction from mouse/touch
// ============================================================
const WaterRippleSimShader = {
  uniforms: {
    tPrev: { value: null },
    uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
    uPrevMousePos: { value: new THREE.Vector2(0.5, 0.5) },
    uResolution: { value: new THREE.Vector2() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tPrev;
    uniform vec2 uMousePos;
    uniform vec2 uPrevMousePos;
    uniform vec2 uResolution;
    varying vec2 vUv;

    const float PI = 3.14159265359;

    void main() {
      vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
      // Full UV range — no bounding box restriction
      vec2 texelSize = 1.0 / vec2(float(SIM_SIZE));

      float damping = mix(0.8, 0.999, 0.91);

      vec4 data = texture2D(tPrev, vUv);
      float height = data.r;
      float velocity = data.g;

      // Laplacian — sample 4 neighbors, clamped to [0,1] to prevent wrapping
      float left  = texture2D(tPrev, clamp(vUv + vec2(-texelSize.x, 0.0), 0.0, 1.0)).r;
      float right = texture2D(tPrev, clamp(vUv + vec2( texelSize.x, 0.0), 0.0, 1.0)).r;
      float up    = texture2D(tPrev, clamp(vUv + vec2(0.0,  texelSize.y), 0.0, 1.0)).r;
      float down  = texture2D(tPrev, clamp(vUv + vec2(0.0, -texelSize.y), 0.0, 1.0)).r;

      float avgNeighbors = (left + right + up + down) * 0.25;
      float laplacian = avgNeighbors - height;

      velocity += laplacian;
      velocity *= damping;
      height += velocity;
      height *= damping;

      // Mouse interaction — direct UV space (no simScale transform)
      float mouseSpeed = distance(uMousePos * aspect, uPrevMousePos * aspect);
      float dist = distance(vUv * aspect, uMousePos * aspect);
      float radius = 0.04;
      if (dist < radius && mouseSpeed > 0.0001) {
        float drop = cos(dist / radius * PI * 0.5);
        float intensity = mouseSpeed * 15.0;
        height += drop * intensity;
      }

      gl_FragColor = vec4(height, velocity, 0.0, 1.0);
    }
  `,
};

// ============================================================
// CYMATICS SIMULATION — audio-driven water displacement
// ============================================================
const CymaticsSimShader = {
  uniforms: {
    tPrev: { value: null },
    uAudioLow: { value: 0 },
    uLowOnset: { value: 0 },
    uSubGain: { value: 1.0 },
    uTimeSinceOnset: { value: 99.0 },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tPrev;
    uniform float uAudioLow;
    uniform float uLowOnset;
    uniform float uSubGain;
    uniform float uTimeSinceOnset;
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;

    const float PI = 3.14159265359;
    const float TAU = 6.28318530718;

    // Pseudo-random hash for spawn positions
    vec2 hash2(float seed) {
      return fract(sin(vec2(seed * 127.1 + 311.7, seed * 269.5 + 183.3)) * 43758.5453);
    }

    void main() {
      vec2 texelSize = 1.0 / vec2(float(SIM_SIZE));
      float damping = mix(0.8, 0.999, 0.2);

      vec4 data = texture2D(tPrev, vUv);
      float height = data.r;
      float velocity = data.g;

      // Laplacian — wave equation propagation (do NOT touch)
      float left  = texture2D(tPrev, clamp(vUv + vec2(-texelSize.x, 0.0), 0.0, 1.0)).r;
      float right = texture2D(tPrev, clamp(vUv + vec2( texelSize.x, 0.0), 0.0, 1.0)).r;
      float up    = texture2D(tPrev, clamp(vUv + vec2(0.0,  texelSize.y), 0.0, 1.0)).r;
      float down  = texture2D(tPrev, clamp(vUv + vec2(0.0, -texelSize.y), 0.0, 1.0)).r;

      float avgNeighbors = (left + right + up + down) * 0.23;
      velocity += (avgNeighbors - height);
      velocity *= damping;
      height += velocity;
      height *= damping;

      // ============================================
      // CYMATICS — two-layer bass coupling model
      // ============================================
      vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

      // Layer B pre-compute: onset age + decay
      float age = uTimeSinceOnset;
      float onsetThresholdBase = 0.35;
      float effOnset = max(0.0, uLowOnset * uSubGain - onsetThresholdBase * (1.0 - min(uSubGain, 1.0)));
      float tau = 0.43;
      float timeDecay = exp(-age / tau);
      bool hasTransientEnergy = timeDecay > 0.008;

      // Layer A pre-compute: sustained rumble drive
      float rumbleDrive = uAudioLow * uSubGain;

      // 3 spawn points — shared coupling points for both layers
      float epoch = floor(uTime * 0.22);

      for (int i = 0; i < CYMATICS_SPAWNS; i++) {
        vec2 spawnPos = hash2(epoch * 3.0 + float(i));
        spawnPos = spawnPos * 0.6 + 0.2;

        // Aspect-corrected distance
        float dist = distance(vUv * aspect, spawnPos * aspect);

        // ---- LAYER A: Sustained bass-rumble vibration ----
        // Runs every frame when bass is present — continuous tremor
        if (rumbleDrive > 0.001) {
          // Envelope grows with drive: quiet = localized, loud = whole plate
          float rumbleRadius = 0.2 + rumbleDrive * 1.2;
          float rumbleEnvelope = smoothstep(0.005, 0.055, dist)
                               * (1.0 - smoothstep(rumbleRadius * 0.2, rumbleRadius, dist));

          // Dense tight rings — slightly tighter than transient layer
          float rumbleRingFreq = 70.0;
          // Slow phase drift so rings feel alive, not frozen
          float rumbleDriftSpeed = 0.9;
          float rumblePhase = dist * rumbleRingFreq - uTime * rumbleDriftSpeed;
          float rumbleRings = sin(rumblePhase * TAU);

          // Quadratic amplitude: quiet bass is much quieter than loud bass
          // (approximates nonlinear coupling — sub power ~ amplitude²)
          float rumbleAmplitude = 0.025;
          float rumbleForce = rumbleRings * rumbleEnvelope * rumbleAmplitude * rumbleDrive * rumbleDrive;
          height += rumbleForce;
        }

        // ---- LAYER B: Transient expanding ring pulses ----
        // Onset-triggered, age-driven propagation (existing implementation)
        if (hasTransientEnergy) {
          float maxRadius = 1.8 + uSubGain * 0.5;
          float innerEase = 0.02;
          float outerEase = maxRadius * 0.75;

          float envelope = smoothstep(0.0, innerEase, dist)
                         * (1.0 - smoothstep(outerEase, maxRadius, dist));

          float ringFreq = 100.0;
          float propagationSpeed = 3.5;
          float phase = dist * ringFreq - age * propagationSpeed;
          float rings = sin(phase * TAU);

          float amplitude = 0.01;
          float force = rings * envelope * timeDecay * amplitude * uSubGain;
          height += force;
        }
      }

      gl_FragColor = vec4(height, velocity, 0.0, 1.0);
    }
  `,
};

// ============================================================
// CYMATICS COMPOSITE — refracts scene through audio-driven height map
// ============================================================
const CymaticsCompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tCymatics: { value: null },
    uResolution: { value: new THREE.Vector2() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tCymatics;
    uniform vec2 uResolution;
    varying vec2 vUv;

    vec3 calculateNormal(vec2 uv) {
      float stepSz = 1.0 / float(SIM_SIZE);
      float strength = 4.0;
      float stepSize = 2.0;
      float s = stepSize * stepSz;
      float left   = texture2D(tCymatics, clamp(uv + vec2(-s, 0.0), 0.0, 1.0)).r;
      float right  = texture2D(tCymatics, clamp(uv + vec2(s, 0.0), 0.0, 1.0)).r;
      float top    = texture2D(tCymatics, clamp(uv + vec2(0.0, -s), 0.0, 1.0)).r;
      float bottom = texture2D(tCymatics, clamp(uv + vec2(0.0, s), 0.0, 1.0)).r;
      vec3 normal;
      normal.x = (right - left) * strength;
      normal.y = -(bottom - top) * strength;
      normal.z = -1.0;
      return normalize(normal);
    }

    void main() {
      vec3 normal = calculateNormal(vUv);
      // Subtle refraction — less aggressive than cursor ripple
      vec3 I = vec3(0.0, 0.0, 1.0);
      float ratio = 1.0 / 1.333;
      vec3 refracted = refract(I, normal, ratio);
      vec2 offset = refracted.xy * 0.12;
      vec2 refractedUv = vUv + offset;

      // Subtle chromatic aberration
      vec2 caOffset = offset * 0.15;
      vec4 color = texture2D(tDiffuse, refractedUv);
      color.r = texture2D(tDiffuse, refractedUv - caOffset).r;
      color.b = texture2D(tDiffuse, refractedUv + caOffset).b;

      gl_FragColor = color;
    }
  `,
};

// ============================================================
// FXAA SHADER — Fast approximate anti-aliasing
// ============================================================
const FXAAShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution; // (1/width, 1/height)
    varying vec2 vUv;

    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

    void main() {
      vec2 texel = uResolution;

      // Sample center and 4 neighbors
      vec3 rgbM  = texture2D(tDiffuse, vUv).rgb;
      vec3 rgbNW = texture2D(tDiffuse, vUv + vec2(-texel.x, -texel.y)).rgb;
      vec3 rgbNE = texture2D(tDiffuse, vUv + vec2( texel.x, -texel.y)).rgb;
      vec3 rgbSW = texture2D(tDiffuse, vUv + vec2(-texel.x,  texel.y)).rgb;
      vec3 rgbSE = texture2D(tDiffuse, vUv + vec2( texel.x,  texel.y)).rgb;

      float lumM  = luma(rgbM);
      float lumNW = luma(rgbNW);
      float lumNE = luma(rgbNE);
      float lumSW = luma(rgbSW);
      float lumSE = luma(rgbSE);

      float lumMin = min(lumM, min(min(lumNW, lumNE), min(lumSW, lumSE)));
      float lumMax = max(lumM, max(max(lumNW, lumNE), max(lumSW, lumSE)));
      float lumRange = lumMax - lumMin;

      // Skip AA if contrast is low
      if (lumRange < max(0.0312, lumMax * 0.125)) {
        gl_FragColor = vec4(rgbM, 1.0);
        return;
      }

      // Compute edge direction
      vec2 dir;
      dir.x = -((lumNW + lumNE) - (lumSW + lumSE));
      dir.y =  ((lumNW + lumSW) - (lumNE + lumSE));
      float dirReduce = max((lumNW + lumNE + lumSW + lumSE) * 0.03125, 0.0078125);
      float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
      dir = clamp(dir * rcpDirMin, -8.0, 8.0) * texel;

      // Sample along edge direction
      vec3 rgbA = 0.5 * (
        texture2D(tDiffuse, vUv + dir * (1.0/3.0 - 0.5)).rgb +
        texture2D(tDiffuse, vUv + dir * (2.0/3.0 - 0.5)).rgb
      );
      vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture2D(tDiffuse, vUv + dir * -0.5).rgb +
        texture2D(tDiffuse, vUv + dir *  0.5).rgb
      );

      float lumB = luma(rgbB);
      if (lumB < lumMin || lumB > lumMax) {
        gl_FragColor = vec4(rgbA, 1.0);
      } else {
        gl_FragColor = vec4(rgbB, 1.0);
      }
    }
  `,
};

const WaterRippleCompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tRipple: { value: null },
    uResolution: { value: new THREE.Vector2() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tRipple;
    uniform vec2 uResolution;
    varying vec2 vUv;

    vec3 calculateNormal(vec2 uv) {
      float stepSz = 1.0 / float(SIM_SIZE);
      float strength = 6.5;
      float stepSize = 2.8;
      float s = stepSize * stepSz;
      float left = texture2D(tRipple, clamp(uv + vec2(-s, 0.0), 0.0, 1.0)).r;
      float right = texture2D(tRipple, clamp(uv + vec2(s, 0.0), 0.0, 1.0)).r;
      float top = texture2D(tRipple, clamp(uv + vec2(0.0, -s), 0.0, 1.0)).r;
      float bottom = texture2D(tRipple, clamp(uv + vec2(0.0, s), 0.0, 1.0)).r;
      vec3 normal;
      normal.x = (right - left) * strength;
      normal.y = -(bottom - top) * strength;
      normal.z = -1.0;
      return normalize(normal);
    }

    vec2 calculateRefraction(vec3 normal) {
      vec3 I = vec3(0.0, 0.0, 1.0);
      float ratio = 1.0 / 1.333;
      vec3 refracted = refract(I, normal, ratio);
      float refractionAmount = 0.2;
      return refracted.xy * refractionAmount;
    }

    void main() {
      vec3 normal = calculateNormal(vUv);
      vec2 refractionOffset = calculateRefraction(normal);
      vec2 refractedUv = vUv + refractionOffset;
      vec3 refractedNormal = calculateNormal(refractedUv);

      // Sample with chromatic aberration
      vec2 caOffset = (refractedUv - vUv) * 0.19 * 0.2;
      vec4 refractedColor = texture2D(tDiffuse, refractedUv);
      refractedColor.r = texture2D(tDiffuse, refractedUv - caOffset).r;
      refractedColor.b = texture2D(tDiffuse, refractedUv + caOffset).b;

      // Specular lighting — directional (no position-dependent hotspot)
      vec3 lightDir = normalize(vec3(0.3, 0.3, 1.0));
      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      vec3 reflectDir = reflect(-lightDir, refractedNormal);
      float diff = max(dot(refractedNormal, lightDir), 0.0);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), 128.0);
      vec3 lighting = vec3(diff) + vec3(spec * 2.4);

      // Shadow — also directional
      float causticsShadow = dot(normal, normalize(vec3(0.3, -0.3, 1.0))) + 1.0;
      float shadowFactor = mix(1.0, causticsShadow, 0.5);
      vec3 lightingFactor = mix(vec3(0.0), lighting, 0.5);

      vec4 finalColor = vec4(refractedColor.rgb - vec3(1.0 - shadowFactor) + lightingFactor, refractedColor.a);
      gl_FragColor = finalColor;
    }
  `,
};

// ============================================================
// SETUP FUNCTION
// ============================================================
export function createPostProcessing(renderer, scene, camera, isMobile = false) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const composer = new EffectComposer(renderer);

  // 1. Render the base scene
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2. Fog pass — reduced FBM iterations on mobile
  const fogPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
      uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
    },
    vertexShader: FogShader.vertexShader,
    fragmentShader: `#define FBM_ITERS ${isMobile ? 2 : 3}\n` + FogShader.fragmentShader,
  });
  fogPass.uniforms.uResolution.value.set(w, h);
  composer.addPass(fogPass);

  // 3. Bloom pass — reduced radius + no second pass on mobile
  const bloomPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2() },
      uAudioHigh: { value: 0 },
    },
    vertexShader: BloomShader.vertexShader,
    fragmentShader: `#define BLOOM_RADIUS ${isMobile ? 2 : 4}\n` + BloomShader.fragmentShader,
  });
  bloomPass.uniforms.uResolution.value.set(w, h);
  composer.addPass(bloomPass);

  // 4. Caustics pass
  const causticsPass = new ShaderPass({
    uniforms: CausticsShader.uniforms,
    vertexShader: CausticsShader.vertexShader,
    fragmentShader: (isMobile ? '#define MOBILE\n' : '') + CausticsShader.fragmentShader,
  });
  causticsPass.uniforms.uResolution.value.set(w, h);
  composer.addPass(causticsPass);

  // 5. Cymatics — audio-driven ping-pong water simulation
  const simSize = isMobile ? 256 : 512;
  const cymaticsRT1 = new THREE.WebGLRenderTarget(simSize, simSize, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
  });
  const cymaticsRT2 = cymaticsRT1.clone();

  const cymaticsSimMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tPrev: { value: cymaticsRT1.texture },
      uAudioLow: { value: 0 },
      uLowOnset: { value: 0 },
      uSubGain: { value: 1.0 },
      uTimeSinceOnset: { value: 99.0 },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(w, h) },
    },
    vertexShader: CymaticsSimShader.vertexShader,
    fragmentShader: `#define SIM_SIZE ${simSize}\n#define CYMATICS_SPAWNS ${isMobile ? 2 : 3}\n` + CymaticsSimShader.fragmentShader,
  });

  const cymaticsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), cymaticsSimMaterial);
  const cymaticsScene = new THREE.Scene();
  cymaticsScene.add(cymaticsQuad);
  const cymaticsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let cymaticsCurrent = cymaticsRT1;
  let cymaticsPrev = cymaticsRT2;

  // Cymatics composite pass
  const cymaticsCompositePass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tCymatics: { value: null },
      uResolution: { value: new THREE.Vector2() },
    },
    vertexShader: CymaticsCompositeShader.vertexShader,
    fragmentShader: `#define SIM_SIZE ${simSize}\n` + CymaticsCompositeShader.fragmentShader,
  });
  cymaticsCompositePass.uniforms.uResolution.value.set(w, h);
  composer.addPass(cymaticsCompositePass);

  // 6. Water ripple — cursor/touch-driven ping-pong simulation
  const rippleRT1 = new THREE.WebGLRenderTarget(simSize, simSize, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
  });
  const rippleRT2 = rippleRT1.clone();

  const rippleSimMaterial = new THREE.ShaderMaterial({
    uniforms: {
      tPrev: { value: rippleRT1.texture },
      uMousePos: { value: new THREE.Vector2(0.5, 0.5) },
      uPrevMousePos: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(w, h) },
    },
    vertexShader: WaterRippleSimShader.vertexShader,
    fragmentShader: `#define SIM_SIZE ${simSize}\n` + WaterRippleSimShader.fragmentShader,
  });

  const rippleQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), rippleSimMaterial);
  const rippleScene = new THREE.Scene();
  rippleScene.add(rippleQuad);
  const rippleCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let currentRT = rippleRT1;
  let prevRT = rippleRT2;

  // Water ripple composite pass
  const rippleCompositePass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tRipple: { value: null },
      uResolution: { value: new THREE.Vector2() },
    },
    vertexShader: WaterRippleCompositeShader.vertexShader,
    fragmentShader: `#define SIM_SIZE ${simSize}\n` + WaterRippleCompositeShader.fragmentShader,
  });
  rippleCompositePass.uniforms.uResolution.value.set(w, h);
  composer.addPass(rippleCompositePass);

  // 7. FXAA anti-aliasing — skip on mobile for performance
  let fxaaPass = null;
  if (!isMobile) {
    fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms.uResolution.value.set(1 / w, 1 / h);
    composer.addPass(fxaaPass);
  }

  function update(time, mousePos, prevMousePos, audioBands, subGain, timeSinceOnset) {
    fogPass.uniforms.uTime.value = time;
    fogPass.uniforms.uMousePos.value.copy(mousePos);
    causticsPass.uniforms.uTime.value = time;
    causticsPass.uniforms.uMousePos.value.copy(mousePos);

    // Audio reactivity
    if (audioBands) {
      bloomPass.uniforms.uAudioHigh.value = audioBands.high;
      cymaticsSimMaterial.uniforms.uAudioLow.value = audioBands.low;
      cymaticsSimMaterial.uniforms.uLowOnset.value = audioBands.lowOnset || 0;
      cymaticsSimMaterial.uniforms.uSubGain.value = subGain !== undefined ? subGain : 1.0;
      cymaticsSimMaterial.uniforms.uTimeSinceOnset.value = timeSinceOnset !== undefined ? timeSinceOnset : 99.0;
    }

    // Cymatics ping-pong simulation
    cymaticsSimMaterial.uniforms.tPrev.value = cymaticsPrev.texture;
    cymaticsSimMaterial.uniforms.uTime.value = time;
    renderer.setRenderTarget(cymaticsCurrent);
    renderer.render(cymaticsScene, cymaticsCamera);
    renderer.setRenderTarget(null);
    cymaticsCompositePass.uniforms.tCymatics.value = cymaticsCurrent.texture;
    // Swap cymatics
    const cTemp = cymaticsCurrent;
    cymaticsCurrent = cymaticsPrev;
    cymaticsPrev = cTemp;

    // Cursor ripple ping-pong simulation
    rippleSimMaterial.uniforms.tPrev.value = prevRT.texture;
    rippleSimMaterial.uniforms.uMousePos.value.copy(mousePos);
    rippleSimMaterial.uniforms.uPrevMousePos.value.copy(prevMousePos);

    renderer.setRenderTarget(currentRT);
    renderer.render(rippleScene, rippleCamera);
    renderer.setRenderTarget(null);

    rippleCompositePass.uniforms.tRipple.value = currentRT.texture;

    // Swap ripple
    const temp = currentRT;
    currentRT = prevRT;
    prevRT = temp;
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    composer.setSize(w, h);
    fogPass.uniforms.uResolution.value.set(w, h);
    bloomPass.uniforms.uResolution.value.set(w, h);
    causticsPass.uniforms.uResolution.value.set(w, h);
    cymaticsCompositePass.uniforms.uResolution.value.set(w, h);
    cymaticsSimMaterial.uniforms.uResolution.value.set(w, h);
    rippleCompositePass.uniforms.uResolution.value.set(w, h);
    rippleSimMaterial.uniforms.uResolution.value.set(w, h);
    if (fxaaPass) fxaaPass.uniforms.uResolution.value.set(1 / w, 1 / h);
  }

  return { composer, update, onResize };
}
