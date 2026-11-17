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

/** Run after the page has loaded and the main thread is idle, so WebGL never competes with first paint. */
export function whenIdle(fn: () => void) {
  const go = () => ('requestIdleCallback' in window ? requestIdleCallback(() => fn(), { timeout: 1500 }) : setTimeout(fn, 200));
  if (document.readyState === 'complete') go();
  else addEventListener('load', go, { once: true });
}
