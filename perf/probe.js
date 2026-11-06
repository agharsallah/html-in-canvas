// Runtime performance probe. Paste into DevTools or run via evaluate_script.
// Settles 2.5s, then samples 5s: fps, frame percentiles, main-thread idle %,
// long animation frames, DOM mutations/s, JS heap. See perf/README.md.
async () => {
  const ms = 5000;
  // Let the page settle first (scenes boot, chapters develop in).
  await new Promise((r) => setTimeout(r, 2500));
  let frames = 0;
  const intervals = [];
  let last = performance.now();
  let idle = 0;
  let mutations = 0;
  let longFrames = 0;
  let blocking = 0;
  let running = true;
  const mo = new MutationObserver((records) => (mutations += records.length));
  mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  const po = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      longFrames += 1;
      blocking += e.blockingDuration || 0;
    }
  });
  try { po.observe({ type: 'long-animation-frame' }); } catch {}
  const raf = (t) => {
    intervals.push(t - last);
    last = t;
    frames += 1;
    if (running) requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  const ric = (deadline) => {
    idle += deadline.timeRemaining();
    if (running) requestIdleCallback(ric);
  };
  requestIdleCallback(ric);
  await new Promise((r) => setTimeout(r, ms));
  running = false;
  mo.disconnect();
  po.disconnect();
  intervals.sort((a, b) => a - b);
  const pct = (p) => +intervals[Math.floor(intervals.length * p)].toFixed(1);
  return {
    fps: +(frames / (ms / 1000)).toFixed(1),
    p50FrameMs: pct(0.5),
    p95FrameMs: pct(0.95),
    idlePct: +((idle / ms) * 100).toFixed(1),
    longFrames,
    blockingMs: Math.round(blocking),
    mutationsPerSec: Math.round(mutations / (ms / 1000)),
    heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null,
    webglCanvases: document.querySelectorAll('canvas').length,
  };
}
