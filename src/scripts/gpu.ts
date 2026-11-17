// When to start the WebGL scenes, and whether the GPU is real.

let cached: boolean | undefined;

/**
 * True when WebGL would run on the CPU (SwiftShader, llvmpipe, Microsoft Basic Render Driver): a browser with
 * hardware acceleration off, a VM, a lab test. There every shader frame blocks the page for a while.
 */
export function softwareGL(): boolean {
  if (cached !== undefined) return cached;
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return (cached = false); // no WebGL at all: the scenes fail on their own and keep their fallbacks
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cached = /swiftshader|llvmpipe|softpipe|basic render/i.test(name);
  } catch {
    cached = false;
  }
  return cached;
}

/**
 * Run once the page has loaded and the main thread is idle, so WebGL never competes with the first paint.
 * Never waits on `load` alone: a request that hangs (an ad blocker, a slow third party) would hold it forever.
 */
export function whenIdle(fn: () => void) {
  let done = false;
  const run = () => { if (!done) { done = true; fn(); } };
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 1200 }) : setTimeout(run, 150));
  if (document.readyState === 'complete') idle();
  else {
    addEventListener('load', idle, { once: true });
    setTimeout(run, 3500);
  }
}

/** On a CPU renderer, how long the static fallback stays when nobody touches the page. */
const SOFTWARE_DELAY = 6000;

/**
 * Start a WebGL scene. With a real GPU: as soon as the page is idle. On a CPU renderer: at the first
 * interaction, or after SOFTWARE_DELAY when there is none, so the page settles before the heavy scene starts
 * and the scene still always arrives. `waiting` runs while the start is deferred (show the fallback).
 */
export function startGL(fn: () => void, waiting?: () => void) {
  whenIdle(() => {
    if (!softwareGL()) return fn();
    waiting?.();
    const evs = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;
    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      clearTimeout(timer);
      evs.forEach((e) => removeEventListener(e, go));
      fn();
    };
    const timer = setTimeout(go, SOFTWARE_DELAY);
    evs.forEach((e) => addEventListener(e, go, { passive: true }));
  });
}

/**
 * A dynamic import that survives a deploy: if the chunk 404s (the page was cached from the previous build),
 * reload once to get the current HTML and its chunk names. Guarded so it can never loop.
 */
export function recoverFromStaleChunks() {
  // Leaving the page aborts the imports still in flight (Firefox reports them as load failures):
  // that is not a stale deploy, and reloading then would hijack the navigation the visitor asked for.
  let leaving = false;
  addEventListener('pagehide', () => { leaving = true; });
  addEventListener('beforeunload', () => { leaving = true; });
  addEventListener('pageshow', () => { leaving = false; });
  addEventListener('vite:preloadError', (e) => {
    if (leaving) return;
    try {
      const k = 'chunk-reload', last = Number(sessionStorage.getItem(k) || 0);
      if (Date.now() - last < 60_000) return; // already tried: keep the fallback instead of looping
      sessionStorage.setItem(k, String(Date.now()));
      e.preventDefault();
      location.reload();
    } catch { /* storage blocked: keep the fallback */ }
  });
}
