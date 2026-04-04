/** Fullscreen quad vertex shader */
export const cursorVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

/** Metaball fragment shader — translucent water cursor with trail */
export const cursorFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2 uResolution;
uniform vec2 uMouse;
uniform vec2 uVelocity;
uniform float uTime;
uniform float uSpeed;

#define TRAIL_COUNT 10
uniform vec2  uTrail[TRAIL_COUNT];
uniform float uTrailAge[TRAIL_COUNT];

float metaball(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  if (d > r * 4.0) return 0.0;
  return (r * r) / (d * d + 0.001);
}

void main() {
  vec2 fragPos = vUv * uResolution;

  // Main blob — stretch along velocity
  vec2 dir = normalize(uVelocity + vec2(0.001, 0.0));
  float stretch = 1.0 + uSpeed * 0.003;

  vec2 toMouse  = fragPos - uMouse;
  float alongVel = dot(toMouse, dir);
  float perpVel  = dot(toMouse, vec2(-dir.y, dir.x));
  vec2 stretched = vec2(alongVel / stretch, perpVel);

  float wobble = 1.0 + sin(uTime * 8.0) * 0.05 * exp(-uSpeed * 0.1);
  float field = metaball(vec2(length(stretched), 0.0), vec2(0.0), 20.0 * wobble);

  // Trail blobs
  for (int i = 0; i < TRAIL_COUNT; i++) {
    float age = uTrailAge[i];
    if (age >= 1.0) continue;
    float radius = mix(10.0, 3.0, age);
    float alpha  = 1.0 - age;
    field += metaball(fragPos, uTrail[i], radius) * alpha;
  }

  // Threshold + edge
  float threshold = 1.0;
  float edge = smoothstep(threshold - 0.3, threshold + 0.1, field);

  // Color — translucent water blob
  vec3 baseColor = vec3(0.85, 0.9, 1.0);
  float glow = smoothstep(threshold - 0.6, threshold, field) * 0.15;
  float inner = smoothstep(threshold, threshold + 2.0, field);
  vec3 color = mix(baseColor, vec3(1.0), inner * 0.6);

  // Edge refraction ring
  float ring = smoothstep(threshold - 0.15, threshold, field)
             - smoothstep(threshold, threshold + 0.3, field);
  color += vec3(0.3, 0.35, 0.4) * ring;

  float alpha = edge * 0.55 + glow;
  gl_FragColor = vec4(color, alpha);
}
`;
