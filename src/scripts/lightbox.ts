// Click an image in the page to open it full screen. Zoom with the wheel, a pinch, the buttons or the keyboard;
// drag to pan. Built on <dialog>, so focus is trapped and Esc closes without extra code.

const TEXT = {
  en: { open: 'Enlarge image', title: 'Image viewer', out: 'Zoom out', in: 'Zoom in', fit: 'Fit to screen', close: 'Close' },
  pt: { open: 'Ampliar imagem', title: 'Visualizador de imagem', out: 'Diminuir zoom', in: 'Aumentar zoom', fit: 'Ajustar à tela', close: 'Fechar' },
};

export function lightbox(root: ParentNode = document) {
  const imgs = [...root.querySelectorAll<HTMLImageElement>('main img')];
  if (!imgs.length) return;
  const T = document.documentElement.lang.toLowerCase().startsWith('pt') ? TEXT.pt : TEXT.en;

  const dlg = document.createElement('dialog');
  dlg.className = 'lb';
  dlg.setAttribute('aria-label', T.title);
  dlg.innerHTML = `
    <div class="lb-view"><img alt="" draggable="false" /></div>
    <p class="lb-cap"></p>
    <div class="lb-bar">
      <button type="button" data-a="out" aria-label="${T.out}">−</button>
      <output aria-live="polite">100%</output>
      <button type="button" data-a="in" aria-label="${T.in}">+</button>
      <button type="button" data-a="fit" aria-label="${T.fit}">[ ]</button>
      <button type="button" data-a="close" aria-label="${T.close}">esc</button>
    </div>`;
  document.body.appendChild(dlg);
  const view = dlg.querySelector<HTMLElement>('.lb-view')!;
  const big = view.querySelector('img')!;
  const cap = dlg.querySelector<HTMLElement>('.lb-cap')!;
  const out = dlg.querySelector('output')!;

  // s = 1 is "fit to screen"; tx/ty are measured from the centre of the viewport
  let s = 1, tx = 0, ty = 0, max = 4;
  const centre = () => { const r = view.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height] as const; };
  const apply = (animate = false) => {
    const [, , vw, vh] = centre();
    // keep the picture on screen: it may only travel as far as it overflows
    const mx = Math.max(0, (big.offsetWidth * s - vw) / 2), my = Math.max(0, (big.offsetHeight * s - vh) / 2);
    tx = Math.max(-mx, Math.min(mx, tx));
    ty = Math.max(-my, Math.min(my, ty));
    big.classList.toggle('anim', animate);
    big.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${s})`;
    view.classList.toggle('zoomed', s > 1.01);
    const pct = `${Math.round(s * 100)}%`;
    if (out.textContent !== pct) out.textContent = pct;
  };
  /** Zoom to `next`, keeping the point (x, y) of the viewport under the finger or cursor. */
  const zoomAt = (next: number, x?: number, y?: number, animate = false) => {
    next = Math.max(1, Math.min(max, next));
    const [cx, cy] = centre();
    const px = (x ?? cx) - cx, py = (y ?? cy) - cy;
    tx = px - ((px - tx) / s) * next;
    ty = py - ((py - ty) / s) * next;
    s = next;
    if (s === 1) tx = ty = 0;
    apply(animate);
  };

  // "fit" always fills the screen in one direction, so a small image is scaled up as well as a large one down
  let nw = 1, nh = 1;
  const size = () => {
    const fit = Math.min(view.clientWidth / nw, view.clientHeight / nh);
    big.style.width = `${Math.round(nw * fit)}px`;
    big.style.height = `${Math.round(nh * fit)}px`;
    // allow zooming until one image pixel covers about two screen pixels, and never less than 4x
    max = Math.max(4, 2 / fit);
    apply();
  };

  const open = (src: HTMLImageElement) => {
    big.src = src.currentSrc || src.src;
    big.alt = src.alt;
    cap.textContent = src.alt;
    nw = src.naturalWidth || src.width || 1;
    nh = src.naturalHeight || src.height || 1;
    s = 1; tx = ty = 0;
    dlg.showModal();
    size();
  };

  for (const img of imgs) {
    if (img.closest('a, button')) continue;
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', img.alt ? `${T.open}: ${img.alt}` : T.open);
    img.addEventListener('click', () => open(img));
    img.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); } });
  }

  dlg.querySelector('.lb-bar')!.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
    if (a === 'in') zoomAt(s * 1.5, undefined, undefined, true);
    else if (a === 'out') zoomAt(s / 1.5, undefined, undefined, true);
    else if (a === 'fit') zoomAt(1, undefined, undefined, true);
    else if (a === 'close') dlg.close();
  });
  dlg.addEventListener('keydown', (e) => {
    const step = 80;
    if (e.key === '+' || e.key === '=') zoomAt(s * 1.5, undefined, undefined, true);
    else if (e.key === '-' || e.key === '_') zoomAt(s / 1.5, undefined, undefined, true);
    else if (e.key === '0') zoomAt(1, undefined, undefined, true);
    else if (e.key === 'ArrowLeft') { tx += step; apply(true); }
    else if (e.key === 'ArrowRight') { tx -= step; apply(true); }
    else if (e.key === 'ArrowUp') { ty += step; apply(true); }
    else if (e.key === 'ArrowDown') { ty -= step; apply(true); }
    else return;
    e.preventDefault();
  });
  view.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(s * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0016)), e.clientX, e.clientY);
  }, { passive: false });

  // one pointer pans, two pinch; a press that does not move is a click
  const pts = new Map<number, { x: number; y: number }>();
  let moved = 0, pinch = 0;
  view.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    view.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) moved = 0;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); moved = 99; }
  });
  view.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (s > 1) { tx += dx; ty += dy; apply(); }
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      tx += dx / 2; ty += dy / 2;
      if (pinch > 0) zoomAt(s * (d / pinch), (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch = d;
    }
  });
  const up = (e: PointerEvent) => {
    if (!pts.delete(e.pointerId)) return;
    if (e.type === 'pointerup' && pts.size === 0 && moved < 6) {
      // on the picture: toggle zoom at that point. Outside it: close.
      const r = big.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dlg.close();
      else zoomAt(s > 1.01 ? 1 : Math.min(max, 2.5), e.clientX, e.clientY, true);
    }
  };
  view.addEventListener('pointerup', up);
  view.addEventListener('pointercancel', up);
  dlg.addEventListener('close', () => { pts.clear(); big.removeAttribute('src'); });
  addEventListener('resize', () => { if (dlg.open) size(); });
}
