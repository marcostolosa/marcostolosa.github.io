// Site-wide living background: a recon map. Domain-warped noise drawn as terrain with contour lines,
// lit in the colour of the section being read, drifting with scroll and the pointer.
// Raw WebGL (no three.js) so every page can afford it; degrades to a still image on slow GPUs.

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';

const frag = (deriv: boolean) => `
${deriv ? '#extension GL_OES_standard_derivatives : enable' : ''}
precision highp float;
uniform vec2 uRes; uniform float uTime, uScroll, uAmt; uniform vec2 uMouse; uniform vec3 uTint;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.03 + 11.7; a *= .5; } return s; }
// the warp field and the second light are low-frequency: fewer octaves, rescaled to the same range
float fbmLo(vec2 p){ return (.5 * noise(p) + .25 * noise(p * 2.03 + 11.7)) * 1.29; }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  p.y -= uScroll * 1.6;                      // the map slides under the page as you scroll
  float t = uTime * .028;
  vec2 q = vec2(fbmLo(p * 1.15 + t), fbmLo(p * 1.15 + vec2(5.2, 1.3) - t * .8));
  float h = fbm(p * 1.5 + q * 1.5);          // terrain height

  vec3 deep = vec3(.006, .016, .011), navy = vec3(.016, .055, .038), violet = vec3(.08, .46, .36);
  vec3 col = mix(deep, navy, smoothstep(.2, .75, h));
  col += uTint * smoothstep(.38, .9, h) * .2 * uAmt;                       // lit ridges
  col += violet * smoothstep(.45, 1., fbmLo(p * .8 - q + 3.1)) * .17 * uAmt;   // a second, cooler light

  // contour lines every 1/11 of height; every fourth one is an index line
  float k = h * 11.;
  ${deriv ? 'float w = max(fwidth(k), 1e-4);' : 'float w = .035;'}
  float line = 1. - smoothstep(0., 1.1, abs(fract(k - .5) - .5) / w);
  float idx = step(.75, fract(floor(k + .5) / 4. + .01));
  col += mix(vec3(.21, .95, .60), uTint, .5) * line * (.08 + idx * .15) * uAmt;

  // glyph rain: columns of flickering 3x5 bit patterns, a bright head and a fading tail
  float rows = 54.;
  float cell = uRes.y / rows;
  vec2 gc = gl_FragCoord.xy / cell;
  vec2 id = floor(gc), f = fract(gc);
  float lane = hash(vec2(id.x, 3.7));
  float head = fract(lane * 7.3 + uTime * (.05 + lane * .09));
  float y = 1. - id.y / rows;
  float tail = fract(head - y);
  float fade = smoothstep(.42, 0., tail) * step(.42, lane);
  vec2 bit = floor(f * vec2(5., 7.));
  float glyph = hash(id + floor(uTime * (1.5 + hash(id) * 4.)) * .37);
  float on = step(.52, hash(bit + glyph * 91.)) * step(bit.x, 2.5) * step(1., bit.y) * step(bit.y, 5.5);
  col += vec3(.21, .95, .60) * on * fade * .12 * uAmt;
  col += vec3(.8, 1., .9) * on * smoothstep(.03, 0., tail) * step(.42, lane) * .2 * uAmt;

  // pointer: a soft search light
  vec2 m = (uMouse - .5) * vec2(uRes.x / uRes.y, 1.);
  col += uTint * .14 * uAmt * exp(-dot(p + vec2(0., uScroll * 1.6) - m, p + vec2(0., uScroll * 1.6) - m) * 5.);

  col *= 1. - .55 * dot(uv - .5, uv - .5);                                   // vignette
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.) - .5) * .022;           // grain, kills banding
  gl_FragColor = vec4(col, 1.);
}`;

const hex = (v: string): [number, number, number] => {
  const n = parseInt(v.trim().replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function backdrop(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return false;
  const deriv = !!gl.getExtension('OES_standard_derivatives');
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag(deriv)));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uTime = U('uTime'), uScroll = U('uScroll'), uAmt = U('uAmt'), uMouse = U('uMouse'), uTint = U('uTint');

  const css = getComputedStyle(document.documentElement);
  const tintOf = (name: string) => hex(css.getPropertyValue(`--t-${name}`) || '#35f29a');
  const zones = [...document.querySelectorAll<HTMLElement>('[data-tint]')];
  const fallbackTint = tintOf('writeup');
  const amt = document.body.dataset.bg === 'quiet' ? 0.55 : 1;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let scale = 1, still = reduce, dirty = true;
  let want = fallbackTint, tint = [...fallbackTint] as [number, number, number];
  let mx = 0.5, my = 0.5, sx = 0.5, sy = 0.5, scroll = 0, sScroll = 0;
  let last = 0, sampled = 0, sum = 0, bad = 0, skip = 4;
  const born = performance.now();

  // The picture is soft by design, so it is drawn at CSS resolution (never device pixels) and capped at about
  // a megapixel: a 4K monitor costs the same as a laptop.
  const BUDGET = 1.0e6;
  const resize = () => {
    const k = scale * Math.min(1, Math.sqrt(BUDGET / Math.max(1, innerWidth * innerHeight)));
    canvas.width = Math.max(1, Math.round(innerWidth * k));
    canvas.height = Math.max(1, Math.round(innerHeight * k));
    gl.viewport(0, 0, canvas.width, canvas.height);
    dirty = true;
  };
  const read = () => {
    scroll = scrollY / Math.max(innerHeight, 1);
    const mid = innerHeight * 0.45;
    const z = zones.find((el) => { const r = el.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
    want = z ? tintOf(z.dataset.tint!) : fallbackTint;
    dirty = true;
  };
  addEventListener('resize', resize);
  let fastUntil = 0;
  addEventListener('scroll', () => { read(); fastUntil = performance.now() + 300; }, { passive: true });
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth; my = 1 - e.clientY / innerHeight; dirty = true; }, { passive: true });

  function frame(now: number) {
    requestAnimationFrame(frame);
    const raw = now - last;
    // ~22 fps is plenty for a slow drift; while the page scrolls the parallax gets the full rate
    if (document.hidden || raw < (still ? 160 : now < fastUntil ? 30 : 44) || (still && !dirty)) return;
    last = now;
    // slow GPU or software rendering: drop resolution, then stop animating and redraw only on input
    if (!still && skip-- <= 0) {
      const degrade = () => { if (scale > 0.5) scale = 0.45; else still = true; sampled = 0; sum = 0; bad = 0; resize(); };
      if (raw > 200 && ++bad >= 2) degrade();
      else {
        sum += Math.min(raw, 200);
        if (++sampled >= 6) { if (sum / sampled > 85) degrade(); sampled = 0; sum = 0; bad = 0; }
      }
    }
    const k = still ? 1 : 0.08;
    let moving = false;
    for (let i = 0; i < 3; i++) { const d = want[i] - tint[i]; tint[i] += d * k; if (Math.abs(d) > 0.004) moving = true; }
    sx += (mx - sx) * k; sy += (my - sy) * k;
    sScroll += (scroll - sScroll) * (still ? 1 : 0.18);
    dirty = moving;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, reduce ? 12 : (now - born) / 1000 + 12);
    gl.uniform1f(uScroll, sScroll * 0.12);
    gl.uniform1f(uAmt, amt);
    gl.uniform2f(uMouse, sx, sy);
    gl.uniform3f(uTint, tint[0], tint[1], tint[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  resize();
  read();
  requestAnimationFrame(frame);
  return true;
}
