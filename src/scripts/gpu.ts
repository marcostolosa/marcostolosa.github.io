// True when WebGL would run on the CPU (SwiftShader, llvmpipe, Microsoft Basic Render Driver). There every
// shader frame blocks the page, so the animated scenes stay off and the static fallbacks show instead.
let cached: boolean | undefined;

export function softwareGL(): boolean {
  if (cached !== undefined) return cached;
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return (cached = true);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cached = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    cached = true;
  }
  return cached;
}

/**
 * Start a WebGL scene: once the page is idle, and on a software renderer only after the visitor first
 * moves, touches, scrolls or types, so a slow CPU-drawn scene never blocks the load. `waiting` runs when
 * the start is deferred, so the caller can show its static fallback meanwhile.
 */
export function startGL(fn: () => void, waiting?: () => void) {
  whenIdle(() => {
    if (!softwareGL()) return fn();
    waiting?.();
    const evs = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'];
    const go = () => { evs.forEach((e) => removeEventListener(e, go)); fn(); };
    evs.forEach((e) => addEventListener(e, go, { once: true, passive: true }));
  });
}

/** Run after the page has loaded and the main thread is idle, so WebGL never competes with first paint. */
export function whenIdle(fn: () => void) {
  const go = () => ('requestIdleCallback' in window ? requestIdleCallback(() => fn(), { timeout: 1500 }) : setTimeout(fn, 200));
  if (document.readyState === 'complete') go();
  else addEventListener('load', go, { once: true });
}
