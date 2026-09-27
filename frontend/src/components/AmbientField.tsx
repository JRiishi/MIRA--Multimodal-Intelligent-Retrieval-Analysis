import { useEffect, useRef } from 'react';
import { useDocumentVisible, usePrefersReducedMotion } from '../lib/motion';

/**
 * Ambient background field, rendered with raw WebGL2.
 *
 * Deliberately written against the platform instead of pulling in three.js:
 * the effect is a single fullscreen fragment shader, so a 3D engine would add
 * roughly 150 kB to ship four lines of GLSL.
 *
 * Engineering constraints, because this sits behind dense numeric data:
 *   - Rendered at 0.5x scale and composited up. The field is soft by design,
 *     so the resolution loss is invisible and the fill cost drops ~4x.
 *   - Device pixel ratio is capped at 1.5.
 *   - The loop suspends when the tab is hidden.
 *   - Under `prefers-reduced-motion` it renders exactly one frame and stops.
 *   - If WebGL2 is unavailable, or any context call fails, the canvas is
 *     removed and the CSS fallback in `index.css` shows through.
 *   - `pointer-events: none` and `aria-hidden`: it is texture, not content.
 */

const VERT = `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// A slowly drifting field of soft anisotropic bands. Kept monochrome and very
// low contrast so text contrast against the canvas is unaffected in practice.
const FRAG = `#version 300 es
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uSeed;
out vec4 outColor;

// Cheap value noise. No texture fetches, so this stays one pass.
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * noise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  // Correct for aspect so the bands are not stretched on wide monitors.
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);

  float t = uTime * 0.014 + uSeed;

  // Two counter-drifting field layers at different scales.
  float field = fbm(p * 2.1 + vec2(t, t * 0.6));
  float grain = fbm(p * 6.4 - vec2(t * 0.8, t * 0.35));

  // Anisotropic banding: squashing y produces contour-like strata, which
  // reads as terrain / survey banding rather than generic plasma.
  float strata = sin((p.x * 3.4 + field * 2.6) * 3.14159) * 0.5 + 0.5;
  strata = pow(strata, 2.2);

  float v = strata * 0.55 + field * 0.30 + grain * 0.15;

  // Radial falloff keeps the centre calm where content sits.
  float falloff = smoothstep(1.15, 0.15, length(p));

  // Cool graphite to deep petrol. No purple, no glow.
  vec3 cool = vec3(0.925, 0.937, 0.949);
  vec3 deep = vec3(0.788, 0.855, 0.851);
  vec3 col = mix(cool, deep, v * 0.34);
  col = mix(cool, col, falloff * 0.85);

  outColor = vec4(col, 1.0);
}`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function AmbientField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const visible = useDocumentVisible();

  useEffect(() => {
    // Reduced motion means no canvas at all. The CSS fallback in index.css
    // provides a static field, which is cheaper and simpler than rendering one
    // frame and throwing the canvas away.
    if (reduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      depth: false,
      stencil: false,
      alpha: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
    });

    // No WebGL2: remove the canvas so the CSS fallback shows through.
    if (!gl) {
      canvas.remove();
      return;
    }

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) {
      canvas.remove();
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      canvas.remove();
      return;
    }
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      canvas.remove();
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uSeed = gl.getUniformLocation(program, 'uSeed');

    gl.useProgram(program);
    // Fixed seed: the field is a stable backdrop, not a randomiser that
    // changes on every mount.
    gl.uniform1f(uSeed, 3.17);

    const RENDER_SCALE = 0.5;
    let frame = 0;
    let start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(window.innerWidth * dpr * RENDER_SCALE));
      const h = Math.max(1, Math.floor(window.innerHeight * dpr * RENDER_SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const draw = (elapsed: number) => {
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    resize();
    draw(0);

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      draw(now - start);
    };

    if (visible) {
      start = performance.now();
      frame = requestAnimationFrame(loop);
    }

    const onResize = () => resize();
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, [reduced, visible]);

  // Reduced motion means no canvas at all. The static CSS fallback carries the
  // field instead, which is cheaper and simpler than rendering one frame.
  const Fallback = <div className="ambient-fallback" aria-hidden="true" />;
  if (reduced) return Fallback;

  return (
    <>
      {Fallback}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        style={{ opacity: 0.5 }}
      >
        <canvas ref={canvasRef} className="w-full h-full block" style={{ imageRendering: 'auto' }} />
      </div>
    </>
  );
}
