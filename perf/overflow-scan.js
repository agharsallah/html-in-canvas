// Layout check: finds text that sticks out of its box. Paste into DevTools or
// run with evaluate_script (as a function). It walks every frame of every
// roll plus the darkroom HUD and reports text whose rectangle crosses the
// edge of the nearest bordered, filled or clipping ancestor. Scroll
// containers are skipped: content below their fold is not an overflow.
async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const isBox = (el) => {
    const cs = getComputedStyle(el);
    return parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderTopWidth) > 0
      || !['rgba(0, 0, 0, 0)', 'transparent'].includes(cs.backgroundColor) || cs.overflow !== 'visible';
  };
  const name = (el) => el.localName + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const scan = (root) => {
    const issues = [];
    const seen = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent.trim();
      const parent = node.parentElement;
      if (!text || !parent || seen.has(parent)) continue;
      if (getComputedStyle(parent).visibility === 'hidden' || parent.closest('[hidden], svg, .sr-only, .visually-hidden') || !parent.checkVisibility()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      let box = parent;
      while (box && box !== root && !isBox(box)) box = box.parentElement;
      if (!box) continue;
      const cs = getComputedStyle(box);
      if (/auto|scroll/.test(cs.overflowX + cs.overflowY)) continue;
      const b = box.getBoundingClientRect();
      const over = Math.max(
        b.left + parseFloat(cs.borderLeftWidth) - r.left,
        r.right - (b.right - parseFloat(cs.borderRightWidth)),
        b.top - r.top,
        r.bottom - b.bottom,
      );
      if (over > 1.5) {
        seen.add(parent);
        issues.push({ text: text.slice(0, 40), el: name(parent), box: name(box), over: Math.round(over) });
      }
    }
    return issues;
  };
  const rolls = ['prologue', 'fog', 'bells', 'lens', 'projector', 'mirrors', 'observatory', 'foundry', 'railway', 'lighthouse', 'vault', 'clockwork', 'epilogue'];
  const out = {};
  for (const roll of rolls) {
    for (const frame of ['story', 'lab', 'practice', 'trial']) {
      location.hash = `#/roll/${roll}/${frame}`;
      await wait(1600);
      const issues = scan(document.querySelector('.chapter') ?? document.body);
      if (issues.length) out[`${roll}/${frame}`] = issues.slice(0, 6);
    }
  }
  location.hash = '#/';
  await wait(1500);
  const hud = scan(document.querySelector('#ui'));
  if (hud.length) out.hud = hud;
  return { width: innerWidth, issues: out };
};
