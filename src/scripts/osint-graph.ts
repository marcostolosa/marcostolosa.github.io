// three.js scene for the home hero: the public record as a 3D link-analysis graph.
// Positions come from the build (src/data/graph.ts); this file only draws and handles input.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, EdgesGeometry, FogExp2, Group,
  IcosahedronGeometry, LineBasicMaterial, LineLoop, LineSegments, Mesh, MeshBasicMaterial, PerspectiveCamera,
  Points, PointsMaterial, Scene, SphereGeometry, Sprite, SpriteMaterial, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { Graph } from '../data/graph';

type Opts = {
  stage: HTMLElement;
  /** Element that receives pointer input (the hero); the stage itself may sit behind the page. */
  input: HTMLElement;
  canvas: HTMLCanvasElement;
  labels: HTMLElement;
  graph: Graph;
  colors: Record<string, string>;
  selected: number;
  onPick: (i: number) => void;
};

const R = 10; // world radius of the graph
const TAU = Math.PI * 2;
const expo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/** Selection reticle: four arcs and four ticks, like a target lock. */
function reticleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.strokeStyle = '#fff';
  g.lineWidth = 5;
  g.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    g.beginPath();
    g.arc(128, 128, 92, a - 0.55, a + 0.55);
    g.stroke();
    const t = (i * Math.PI) / 2;
    g.beginPath();
    g.moveTo(128 + Math.cos(t) * 104, 128 + Math.sin(t) * 104);
    g.lineTo(128 + Math.cos(t) * 122, 128 + Math.sin(t) * 122);
    g.stroke();
  }
  return new CanvasTexture(c);
}

export function mount(o: Opts) {
  const { stage, input, canvas, graph } = o;
  const { nodes, edges } = graph;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  // Drawn on black, then the last pass zeroes alpha: with premultiplied alpha the browser composites the canvas
  // additively, so the site backdrop shows through the scene without any CSS blend mode.
  const scene = new Scene();
  scene.background = new Color(0x000000);
  scene.fog = new FogExp2(0x000000, 0.016);
  const camera = new PerspectiveCamera(40, 1, 0.1, 300);
  const world = new Group();
  const far = new Group();
  scene.add(world, far);

  const glow = glowTexture();
  const adj: number[][] = nodes.map(() => []);
  edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  const pos = nodes.map((n) => new Vector3(n.p[0] * R, n.p[1] * R, n.p[2] * R));
  const base = nodes.map((n) => new Color(o.colors[n.type]));

  // --- nodes: a solid core plus an additive halo
  const sphere = new SphereGeometry(1, 28, 20);
  const cores: Mesh<SphereGeometry, MeshBasicMaterial>[] = [];
  const halos: Sprite[] = [];
  nodes.forEach((n, i) => {
    const core = new Mesh(sphere, new MeshBasicMaterial({ color: base[i].clone() }));
    core.position.copy(pos[i]);
    const halo = new Sprite(new SpriteMaterial({ map: glow, color: base[i], blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.5 }));
    halo.position.copy(pos[i]);
    world.add(core, halo);
    cores.push(core);
    halos.push(halo);
  });

  // the subject of the investigation wears a rotating cage
  const cage = new LineSegments(
    new EdgesGeometry(new IcosahedronGeometry(1.75, 1)),
    new LineBasicMaterial({ color: base[0], transparent: true, opacity: 0.4, blending: AdditiveBlending, depthWrite: false }),
  );
  world.add(cage);

  // --- edges
  const eGeo = new BufferGeometry();
  const ePos = new Float32Array(edges.length * 6);
  const eCol = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], k) => { pos[a].toArray(ePos, k * 6); pos[b].toArray(ePos, k * 6 + 3); });
  eGeo.setAttribute('position', new BufferAttribute(ePos, 3));
  eGeo.setAttribute('color', new BufferAttribute(eCol, 3));
  world.add(new LineSegments(eGeo, new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false })));

  // --- pulses: one packet travelling along each edge, away from the subject
  const pGeo = new BufferGeometry();
  const pPos = new Float32Array(edges.length * 3);
  const pCol = new Float32Array(edges.length * 3);
  const pT = edges.map((_, k) => (k * 0.37) % 1);
  const pSpeed = edges.map((_, k) => 0.16 + ((k * 7) % 5) * 0.03);
  pGeo.setAttribute('position', new BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new BufferAttribute(pCol, 3));
  const pulses = new Points(pGeo, new PointsMaterial({ size: 0.5, map: glow, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false }));
  pulses.visible = !reduce;
  world.add(pulses);

  // --- range rings through the subject, like a recon radar
  [0.45, 0.8, 1.15].forEach((f, k) => {
    const pts: Vector3[] = [];
    for (let i = 0; i < 128; i++) pts.push(new Vector3(Math.cos((i / 128) * TAU) * R * f, 0, Math.sin((i / 128) * TAU) * R * f));
    world.add(new LineLoop(new BufferGeometry().setFromPoints(pts), new LineBasicMaterial({ color: 0x35f29a, transparent: true, opacity: 0.16 - k * 0.035, depthWrite: false })));
  });

  // --- distant dust for depth
  const dust = new Float32Array(1500 * 3);
  let s = 9;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1500; i++) {
    const r = 16 + rnd() * 60, th = rnd() * TAU, ph = Math.acos(rnd() * 2 - 1);
    dust.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.7, r * Math.sin(ph) * Math.sin(th)], i * 3);
  }
  const dGeo = new BufferGeometry();
  dGeo.setAttribute('position', new BufferAttribute(dust, 3));
  far.add(new Points(dGeo, new PointsMaterial({ size: 0.22, map: glow, color: 0x5fd8a4, transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false })));

  // --- selection reticle
  const reticle = new Sprite(new SpriteMaterial({ map: reticleTexture(), transparent: true, depthTest: false, depthWrite: false }));
  world.add(reticle);

  // --- labels live in the DOM so the type stays crisp
  const labelEls = nodes.map((n) => {
    const el = document.createElement('span');
    el.textContent = n.label;
    el.dataset.t = n.type;
    o.labels.appendChild(el);
    return el;
  });

  // --- post: bloom
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.55, 0.55, 0.3);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb, 0.); }',
  }));

  // --- state
  let w = 1, h = 1, wide = true;
  let selected = o.selected, hover = -1;
  let lit = new Set<number>();
  const level = nodes.map(() => 1); // current brightness per node
  const appear = nodes.map(() => (reduce ? 1 : 0));
  const screen = nodes.map(() => ({ x: 0, y: 0, r: 0, z: 0 }));
  let yaw = -0.5, yawTarget: number | null = null, pitch = 0.2, pitchUser = 0.2;
  let px = 0, py = 0, idleUntil = 0, dragging = false, moved = 0, lastX = 0, lastY = 0;
  let onScreen = true, raf = 0, last = performance.now();
  const born = last;
  const v = new Vector3();

  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const labelW: number[] = [];
  const labelOrder = () => {
    const rank = (i: number) => (i === selected ? 0 : i === hover ? 1 : lit.has(i) ? 2 : 3);
    return nodes.map((_, i) => i).sort((a, b) => rank(a) - rank(b));
  };
  // Ambient mode: below the hero the scene stays on screen, flies to the cluster the section talks about, and dims.
  let mode: string | null = null;
  let zoom = 1, zoomT = 1, offK = 1, offT = 1, baseZ = 28.5;
  const setLit = () => {
    lit = mode ? new Set([0, ...nodes.map((n, i) => (n.type === mode ? i : -1)).filter((i) => i >= 0)]) : new Set([selected, ...adj[selected]]);
  };
  const applyCam = () => {
    camera.position.set(0, 0, baseZ * zoom);
    if (wide) camera.setViewOffset(w, h, -w * 0.17 * offK, h * 0.09 * offK, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  setLit();

  const facePoint = (p: Vector3) => {
    if (Math.hypot(p.x, p.z) < 0.5) return;
    const want = Math.atan2(-p.x, p.z) + (wide && !mode ? 0.35 : 0);
    yawTarget = yaw + ((((want - yaw + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  };
  const faceNode = (i: number) => facePoint(pos[i]);

  // Adaptive quality: slow GPUs (or software rendering) lose bloom first, then resolution, so input never lags.
  let tier = 0, slowFrames = 0, sampled = 0, slowSum = 0;
  let skip = 4, bad = 0; // the first frames compile shaders and are not representative
  const down = () => { tier++; slowFrames = 0; bad = 0; sampled = 0; slowSum = 0; bloom.enabled = false; pulses.visible = pulses.visible && tier < 3; resize(); };
  const measure = (raw: number, capped: boolean) => {
    if (tier >= 3 || skip-- > 0) return;
    // a frame that was held back on purpose says nothing about the GPU unless it is grossly late
    if (capped && raw <= 200) return;
    // two very slow frames are enough evidence; otherwise judge the average of a short window
    if (raw > 200 && ++bad >= 2) return down();
    slowSum += Math.min(raw, 200);
    if (++sampled < 8) return;
    const avg = slowSum / sampled;
    sampled = 0; slowSum = 0; bad = 0;
    slowFrames = avg > 42 ? slowFrames + 1 : 0;
    // tier 3 is the last resort: a few frames per second, transitions snap instead of easing
    if (slowFrames >= 2 || avg > 110) down();
  };

  let lowRes = false, lowTimer = 0, labelsOff = false;
  function resize() {
    w = stage.clientWidth;
    h = stage.clientHeight;
    wide = w >= 900;
    // Bloom hides the difference above 1.5x, and behind the page (blurred, dimmed) a third of the pixels is enough.
    const full = tier === 0 ? Math.min(devicePixelRatio || 1, 1.5) : tier === 1 ? 1 : 0.6;
    const dpr = lowRes ? Math.min(full, 0.6) : full;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    // On wide screens the copy sits on the left, so the graph is shifted right and slightly up (see applyCam).
    const fit = wide ? Math.min(1, camera.aspect / 1.9) : Math.min(1, camera.aspect / 0.95);
    baseZ = (wide ? 28.5 : 23.5) / Math.max(0.5, fit);
    applyCam();
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const raw = now - last;
    if (!onScreen || document.hidden) { last = now; return; }
    if (tier === 3 && raw < 240) return;
    // Full rate only while something is being driven: the intro, a drag, a hover, a camera move.
    // Idle rotation runs at ~30 fps, and ~20 fps when the scene is only a blurred backdrop for the page.
    const t = (now - born) / 1000;
    const busy = t < 4.5 || dragging || hover >= 0 || yawTarget !== null || Math.abs(zoomT - zoom) > 0.001 || Math.abs(offT - offK) > 0.001;
    const capped = !busy && !reduce;
    if (raw < (busy ? 14 : mode ? 48 : 31)) return;
    const dt = tier === 3 ? 1 : Math.min(0.06, raw / 1000);
    last = now;
    measure(raw, capped);

    // orientation
    if (!dragging) {
      if (yawTarget !== null) {
        yaw += (yawTarget - yaw) * (reduce || tier === 3 ? 1 : 1 - Math.exp(-dt * 3.2));
        if (Math.abs(yawTarget - yaw) < 0.002) yawTarget = null;
      } else if (!reduce && tier < 3 && hover < 0 && now > idleUntil) yaw += dt * 0.055;
    }
    if (Math.abs(zoomT - zoom) > 0.001 || Math.abs(offT - offK) > 0.001) {
      const e = tier === 3 ? 1 : 1 - Math.exp(-dt * 2.6);
      zoom += (zoomT - zoom) * e;
      offK += (offT - offK) * e;
      applyCam();
    }
    pitch += (pitchUser + py * 0.07 - pitch) * (1 - Math.exp(-dt * 5));
    world.rotation.set(pitch, yaw + px * 0.06, 0);
    far.rotation.set(pitch * 0.5, yaw * 0.35, 0);
    cage.rotation.set(t * 0.21, t * 0.33, 0);

    // nodes
    for (let i = 0; i < nodes.length; i++) {
      if (!reduce) appear[i] = expo(Math.max(0, (t - 0.25 - nodes[i].depth * 0.38 - (i % 5) * 0.05) / 0.9));
      const want = lit.has(i) ? 1 : i === hover ? 0.85 : 0.22;
      level[i] += (want - level[i]) * (1 - Math.exp(-dt * 7));
      const r = nodes[i].size * 0.92 * appear[i] * (i === hover ? 1.18 : 1);
      cores[i].scale.setScalar(Math.max(0.0001, r));
      cores[i].material.color.copy(base[i]).multiplyScalar((0.25 + level[i] * 0.75) * (i === 0 ? 0.82 : 1));
      halos[i].scale.setScalar(r * (i === 0 ? 4.2 : 5));
      (halos[i].material as SpriteMaterial).opacity = 0.1 + level[i] * 0.42;
    }
    cage.scale.setScalar(appear[0]);

    // edges and pulses
    for (let k = 0; k < edges.length; k++) {
      const [a, b] = edges[k];
      const on = lit.has(a) && lit.has(b) && (mode !== null || a === selected || b === selected);
      const vis = Math.min(appear[a], appear[b]) * (on ? 0.9 : 0.16);
      eCol.set([base[a].r * vis, base[a].g * vis, base[a].b * vis, base[b].r * vis, base[b].g * vis, base[b].b * vis], k * 6);
      pT[k] = (pT[k] + dt * pSpeed[k] * (on ? 2.2 : 1)) % 1;
      v.lerpVectors(pos[a], pos[b], pT[k]).toArray(pPos, k * 3);
      const pv = Math.min(appear[a], appear[b]) * (on ? 1 : 0.35) * Math.sin(pT[k] * Math.PI);
      pCol.set([base[b].r * pv, base[b].g * pv, base[b].b * pv], k * 3);
    }
    eGeo.attributes.color.needsUpdate = true;
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;

    // reticle
    reticle.visible = !mode;
    reticle.position.copy(pos[selected]);
    reticle.scale.setScalar((nodes[selected].size * 3.4 + 1.1) * (reduce ? 1 : 1 + Math.sin(t * 2.4) * 0.05));
    (reticle.material as SpriteMaterial).color.copy(base[selected]);
    (reticle.material as SpriteMaterial).rotation = reduce ? 0 : t * 0.25;

    // labels
    world.updateMatrixWorld();
    const pxPerUnit = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
    placed.length = 0;
    // behind the page every label is hidden: after one pass that hides them, stop touching the DOM
    for (const i of mode && labelsOff ? [] : labelOrder()) {
      v.copy(pos[i]).applyMatrix4(world.matrixWorld);
      const dist = camera.position.z - v.z;
      v.project(camera);
      const sc = screen[i];
      sc.x = (v.x * 0.5 + 0.5) * w;
      sc.y = (-v.y * 0.5 + 0.5) * h;
      sc.z = dist;
      sc.r = (nodes[i].size * 0.92 * pxPerUnit) / dist;
      const strong = lit.has(i) || i === hover;
      let lx = sc.x + sc.r + 9;
      let show = !mode && appear[i] > 0.6 && (strong || (wide && nodes[i].key));
      const el = labelEls[i];
      if (show) {
        // labels are placed strongest first; a weaker one that would collide stays hidden
        const lw = labelW[i] || (labelW[i] = el.offsetWidth);
        const hit = (b: { x: number; y: number; w: number; h: number }) =>
          placed.some((q) => b.x < q.x + q.w + 6 && q.x < b.x + b.w + 6 && b.y < q.y + q.h + 2 && q.y < b.y + b.h + 2);
        let box = { x: sc.x + sc.r + 9, y: sc.y - 9, w: lw, h: 18 };
        // try the right side first, then the left; neighbours of the selection always get one of the two
        if (i !== selected && hit(box)) {
          const left = { ...box, x: sc.x - sc.r - 9 - lw };
          if (!hit(left) || lit.has(i)) box = left;
          else show = false;
        }
        if (show) { placed.push(box); lx = box.x; }
      }
      el.style.opacity = show ? String(lit.has(i) || i === hover ? 1 : 0.62) : '0';
      el.style.transform = `translate3d(${lx.toFixed(1)}px, ${sc.y.toFixed(1)}px, 0) translateY(-50%)`;
      el.classList.toggle('on', i === selected);
    }

    labelsOff = mode !== null;
    composer.render();
  }

  // --- input
  const pick = (x: number, y: number) => {
    let best = -1, bd = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const sc = screen[i];
      const d = Math.hypot(sc.x - x, sc.y - y) - sc.r;
      if (d < 16 && d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const local = (e: PointerEvent) => { const b = stage.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] as const; };

  const free = (t: EventTarget | null) => t instanceof Element && input.contains(t) && !t.closest('a, button, .insp, .legend');
  input.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || mode || !free(e.target)) return;
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
    yawTarget = null;
  });
  addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    idleUntil = performance.now() + 5000;
    if (moved < 6 && free(e.target)) {
      const [x, y] = local(e);
      const i = pick(x, y);
      if (i >= 0) o.onPick(i);
    }
  });
  addEventListener('pointercancel', () => { dragging = false; });
  addEventListener('pointermove', (e) => {
    const [x, y] = local(e);
    px = (x / w) * 2 - 1;
    py = (y / h) * 2 - 1;
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      yaw += dx * 0.006;
      if (e.pointerType === 'mouse') pitchUser = Math.max(-0.5, Math.min(0.7, pitchUser + dy * 0.004));
      lastX = e.clientX; lastY = e.clientY;
      return;
    }
    const inside = !mode && x >= 0 && y >= 0 && x <= w && y <= h && free(e.target);
    hover = inside && e.pointerType === 'mouse' ? pick(x, y) : -1;
    input.style.cursor = hover >= 0 ? 'pointer' : '';
  });

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(stage);
  resize();
  raf = requestAnimationFrame(frame);

  return {
    select(i: number, turn = true) {
      selected = i;
      setLit();
      if (turn) { faceNode(i); idleUntil = performance.now() + 7000; }
    },
    /** Scroll focus: a node type to fly to, or null to return to the interactive hero view. */
    focus(type: string | null) {
      if (!wide) type = null;
      if (type === mode) return;
      mode = type;
      setLit();
      zoomT = mode ? 0.62 : 1;
      offT = mode ? 0 : 1;
      if (mode) {
        const c = new Vector3();
        let k = 0;
        nodes.forEach((n, i) => { if (n.type === mode) { c.add(pos[i]); k++; } });
        if (k) facePoint(c.multiplyScalar(1 / k));
        stage.dataset.mode = 'ambient';
        // once the CSS blur has faded in, drop the resolution: it cannot be seen through the blur
        clearTimeout(lowTimer);
        lowTimer = window.setTimeout(() => { lowRes = true; resize(); }, 900);
      } else {
        delete stage.dataset.mode;
        clearTimeout(lowTimer);
        if (lowRes) { lowRes = false; resize(); }
        faceNode(selected);
      }
      idleUntil = performance.now() + 4000;
    },
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
