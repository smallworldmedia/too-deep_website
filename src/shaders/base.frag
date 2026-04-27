// Base composition fragment — 5-layer composite (gradient, grid, color adj, 2 text layers)
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMousePos;
uniform sampler2D uTitleTexture;    // L3: "TOO DEEP"
uniform sampler2D uArtistTexture;   // L4: "JEFF SORKOWITZ"


uniform float uTitleOpacity;        // Intro animation: 0→1
uniform float uTitleScale;          // Intro animation: 0.92→1.0
uniform float uArtistOpacity;       // Intro animation: 0→1
uniform float uArtistScale;         // Intro animation: 0.92→1.0

varying vec2 vUv;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

// --- Dithering (GLSL1 compatible) ---
float deband(vec2 fragCoord) {
  return (fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
}

// --- OkLab gradient ---
vec3 getGradColor(int index) {
  if (index == 0) return vec3(0.133, 0.153, 0.918);
  if (index == 1) return vec3(0.192, 0.286, 0.792);
  return vec3(0.075, 0.455, 0.808);
}
float getGradStop(int index) {
  if (index == 0) return 0.0;
  if (index == 1) return 0.4281;
  return 0.6;
}

vec2 rotateCoord(vec2 coord, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec2(coord.x * c - coord.y * s, coord.x * s + coord.y * c);
}
vec3 linearFromSrgb(vec3 rgb) { return pow(max(rgb, vec3(0.0)), vec3(2.2)); }
vec3 srgbFromLinear(vec3 lin) { return pow(max(lin, vec3(0.0)), vec3(1.0/2.2)); }
vec3 safeCbrt(vec3 v) { return sign(v) * pow(abs(v), vec3(1.0/3.0)); }

vec3 oklabMix(vec3 lin1, vec3 lin2, float a) {
  const mat3 kCONEtoLMS = mat3(
    0.4121656120, 0.2118591070, 0.0883097947,
    0.5362752080, 0.6807189584, 0.2818474174,
    0.0514575653, 0.1074065790, 0.6302613616);
  const mat3 kLMStoCONE = mat3(
    4.0767245293, -1.2681437731, -0.0041119885,
    -3.3072168827, 2.6093323231, -0.7034763098,
    0.2307590544, -0.3411344290, 1.7068625689);
  vec3 lms1 = safeCbrt(kCONEtoLMS * lin1);
  vec3 lms2 = safeCbrt(kCONEtoLMS * lin2);
  vec3 lms = mix(lms1, lms2, a);
  lms *= 1.0 + 0.025 * a * (1.0 - a);
  return kLMStoCONE * (lms * lms * lms);
}

vec3 getGradientColor(float position) {
  position = clamp(position, 0.0, 1.0);
  for (int i = 0; i < 2; i++) {
    float stopA = getGradStop(i);
    float stopB = getGradStop(i + 1);
    if (position <= stopB || i == 1) {
      float denom = max(stopB - stopA, 0.00001);
      float t = clamp((position - stopA) / denom, 0.0, 1.0);
      vec3 linA = linearFromSrgb(getGradColor(i));
      vec3 linB = linearFromSrgb(getGradColor(i + 1));
      return srgbFromLinear(oklabMix(linA, linB, t));
    }
  }
  return getGradColor(2);
}

// L0: Animated gradient
vec4 computeGradient(vec2 uv) {
  vec2 pos = vec2(0.5, 0.5);
  uv -= pos;
  uv /= max(0.5 * 2.0, 1e-5);
  uv = rotateCoord(uv, (-0.25 - 0.5) * 2.0 * PI);
  float gradPos = uv.x + 0.5;
  gradPos -= uTime * 0.01;
  float cycle = floor(gradPos);
  bool reverse = mod(cycle, 2.0) < 1.0;
  float animatedPos = reverse ? 1.0 - fract(gradPos) : fract(gradPos);
  vec3 color = getGradientColor(animatedPos);
  color += deband(gl_FragCoord.xy);
  return vec4(color, 1.0);
}

// L1: Grid pattern (pool tiles)
mat2 rot(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

float gridSDF(vec2 st, float tile) {
  vec2 grid = fract(st);
  vec2 distToEdge = min(grid, 1.0 - grid);
  return min(distToEdge.x, distToEdge.y) - tile * 0.5;
}

vec3 blendVividLight(vec3 src, vec3 dst) {
  return vec3(
    (src.x <= 0.5) ? (1.0 - (1.0 - dst.x) / max(2.0 * src.x, 0.001)) : (dst.x / max(2.0 * (1.0 - src.x), 0.001)),
    (src.y <= 0.5) ? (1.0 - (1.0 - dst.y) / max(2.0 * src.y, 0.001)) : (dst.y / max(2.0 * (1.0 - src.y), 0.001)),
    (src.z <= 0.5) ? (1.0 - (1.0 - dst.z) / max(2.0 * src.z, 0.001)) : (dst.z / max(2.0 * (1.0 - src.z), 0.001))
  );
}

vec4 computeGrid(vec2 uv, vec4 bg) {
  float aspectRatio = uResolution.x / uResolution.y;
  float px = 1.0 / max(uResolution.x, uResolution.y);
  float py = px / aspectRatio;
  float scl = 40.0 * 0.848;
  float minpx = min(px, py);
  float tile = (minpx + 0.01 / scl) * scl;
  tile = floor(tile / minpx + 0.5) * minpx;
  vec2 st = (uv - vec2(0.5, 0.5)) * scl * vec2(aspectRatio, 1.0);
  st.y -= uTime * 0.05;
  float sdf = gridSDF(st, tile);
  float smoothRadius = minpx * scl;
  float pattern = 1.0 - smoothstep(-smoothRadius, smoothRadius, sdf);
  float layerMix = pattern * 0.94;
  vec3 blended = blendVividLight(vec3(0.55, 0.55, 0.65), bg.rgb);
  // Soften grid edges by averaging with offset samples
  float sdf2 = gridSDF(st + vec2(minpx * scl * 0.5, 0.0), tile);
  float sdf3 = gridSDF(st + vec2(0.0, minpx * scl * 0.5), tile);
  float p2 = 1.0 - smoothstep(-smoothRadius, smoothRadius, sdf2);
  float p3 = 1.0 - smoothstep(-smoothRadius, smoothRadius, sdf3);
  layerMix = (layerMix + p2 * 0.94 + p3 * 0.94) / 3.0;
  return vec4(blended, 1.0) * layerMix;
}

// L2: Color adjustments (HSL)
float hueToRgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}
vec3 hslToRgb(vec3 hsl) {
  float h = hsl.x, s = hsl.y, l = hsl.z;
  vec3 rgb = vec3(l);
  if (s != 0.0) {
    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;
    rgb.r = hueToRgb(p, q, h + 1.0/3.0);
    rgb.g = hueToRgb(p, q, h);
    rgb.b = hueToRgb(p, q, h - 1.0/3.0);
  }
  return rgb;
}
vec3 rgbToHsl(vec3 rgb) {
  float mx = max(max(rgb.r, rgb.g), rgb.b);
  float mn = min(min(rgb.r, rgb.g), rgb.b);
  float h, s, l = (mx + mn) / 2.0;
  if (mx == mn) { h = s = 0.0; }
  else {
    float d = mx - mn;
    s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
    if (mx == rgb.r) h = (rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6.0 : 0.0);
    else if (mx == rgb.g) h = (rgb.b - rgb.r) / d + 2.0;
    else h = (rgb.r - rgb.g) / d + 4.0;
    h /= 6.0;
  }
  return vec3(h, s, l);
}

vec4 computeColorAdj(vec4 color) {
  if (color.a <= 0.001) return vec4(0);
  color.rgb = rgbToHsl(color.rgb);
  color.x = fract(color.x + 1.0);
  color.y = clamp(color.y * 1.03, 0.0, 1.0);
  color.z = clamp(color.z + -0.07, 0.0, 1.0);
  color.rgb = hslToRgb(color.rgb);
  color.rgb = 0.57 * (color.rgb - 0.5) + 0.5;
  color.r = clamp(color.r - 0.09, 0.0, 1.0);
  color.b = clamp(color.b + 0.09, 0.0, 1.0);
  color.rgb = pow(max(color.rgb, 0.0001), vec3(1.0 / (0.15 + 1.0)));
  color = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
  return color;
}

void main() {
  vec2 uv = vUv;

  // L0: Gradient background
  vec4 result = computeGradient(uv);

  // L1: Grid overlay
  vec4 gridColor = computeGrid(uv, clamp(result, 0.0, 1.0));
  result = gridColor + result * (1.0 - gridColor.a);

  // L2: Color adjustments
  vec4 adjusted = computeColorAdj(result);
  result = adjusted;

  // L3: "TOO DEEP" text — with intro scale + opacity
  vec2 titleUv = (uv - 0.5) / max(uTitleScale, 0.001) + 0.5;
  vec4 titleColor = vec4(0.0);
  if (titleUv.x >= 0.0 && titleUv.x <= 1.0 && titleUv.y >= 0.0 && titleUv.y <= 1.0) {
    titleColor = texture2D(uTitleTexture, titleUv);
  }
  titleColor.a *= uTitleOpacity;
  result = titleColor + result * (1.0 - titleColor.a);

  // L4: "JEFF SORKOWITZ" text — with intro scale + opacity
  vec2 artistUv = (uv - 0.5) / max(uArtistScale, 0.001) + 0.5;
  vec4 artistColor = vec4(0.0);
  if (artistUv.x >= 0.0 && artistUv.x <= 1.0 && artistUv.y >= 0.0 && artistUv.y <= 1.0) {
    artistColor = texture2D(uArtistTexture, artistUv);
  }
  artistColor.a *= uArtistOpacity;
  result = artistColor + result * (1.0 - artistColor.a);

  gl_FragColor = result;
}
