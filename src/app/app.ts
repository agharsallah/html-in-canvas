/**
 * Composition root. Wires capabilities, the game store, the 3D darkroom,
 * the HUD and the chapter router together. Nothing else creates singletons.
 */
import { detectCapabilities } from '../core/capabilities';
import { createBrowserStore } from '../core/storage';
import { mark, markFirstFrame } from '../core/perf';
import { createGameStore } from '../game/store';
import { drafts } from '../game/drafts';
import { createFrameDriver } from '../hic/paint';
import { mountAlbum } from '../ui/album';
import { prefersReducedMotion } from '../ui/dom';
import { mountHud } from '../ui/hud';
import { mountToasts } from '../ui/toasts';
import { mountXray } from '../ui/xray';
import { createSoundToggle } from '../ui/components/sound-toggle';
import { Hub } from '../world/hub';
import { Stage } from '../world/stage';
import { NativeSurfaces } from '../world/surfaces/native-surfaces';
import type { SurfaceBackend } from '../world/surfaces/surface';
import { createChapterController } from './chapter-controller';
import { navigate, onRouteChange, parseRoute } from './router';

export async function startApp(): Promise<void> {
  mark('start');
  const canvas = document.querySelector<HTMLCanvasElement>('#world');
  const layer = document.querySelector<HTMLElement>('#world-layer');
  const ui = document.querySelector<HTMLElement>('#ui');
  if (!canvas || !layer || !ui) throw new Error('Drawable: missing #world, #world-layer or #ui');

  const caps = detectCapabilities();
  document.body.dataset.mode = caps.mode;

  const store = createGameStore(createBrowserStore());
  const params = new URLSearchParams(location.search);
  // Reset first, so `?reset&unlock=all` gives a fresh save with everything open.
  if (params.has('reset')) {
    store.dispatch({ type: 'reset' });
    drafts.clear();
  }
  if (params.get('unlock') === 'all') store.dispatch({ type: 'unlock-all' });

  mountToasts(ui, store);
  const album = mountAlbum(ui, store);
  // The wordmark always leads home: the hub is created below, so bind late.
  let goHome = () => navigate({ name: 'hub' });
  mountHud(ui, { caps, store, onOpenAlbum: () => album.open(), onHome: () => goHome() });
  mountXray(ui, caps);
  ui.querySelector('.hud-status .hud-xray')?.before(createSoundToggle('hud-album'));
  // Sound and confetti for goals and answers: chapters only, so it loads
  // after the darkroom instead of in front of it.
  void import('../ui/fx/feedback-fx').then((m) => m.mountFeedbackFx(ui, store));

  mark('ui-ready');
  const stage = new Stage(canvas);
  mark('stage-ready');
  // The CSS3D fallback is only fetched by browsers that need it.
  const surfaces: SurfaceBackend = caps.mode === 'native'
    ? new NativeSurfaces(stage.renderer)
    : new (await import('../world/surfaces/css3d-surfaces')).Css3dSurfaces(stage.scene, layer);

  const hub = new Hub({
    stage,
    surfaces,
    store,
    onEnter: (roll) => navigate({ name: 'roll', roll }),
    onKeyboardReach: () => {
      store.dispatch({ type: 'earn-stamp', id: 'tab-walker' });
      store.dispatch({ type: 'collect-negative', id: 'secret-keyboard' });
    },
  });

  goHome = () => {
    album.close();
    navigate({ name: 'hub' });
    hub.goHome(store.getState());
  };

  mark('hub-ready');
  // Compile every shader in parallel (KHR_parallel_shader_compile) instead of
  // stalling inside the first frame. Capped, so a slow driver can't hold us.
  await Promise.race([
    stage.renderer.compileAsync(stage.scene, stage.camera).catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 400)),
  ]);
  mark('shaders-ready');
  const firstFrame = markFirstFrame();
  const driver = createFrameDriver(canvas, caps.mode === 'native', ({ dt, time, changed }) => {
    // Move the scene first, then upload only what is on screen, then draw.
    hub.update(dt, time, prefersReducedMotion());
    surfaces.prepare(changed, stage.camera, stage.viewport);
    stage.render();
    surfaces.finish(stage.camera, stage.viewport);
    firstFrame();
  });
  driver.start();

  // Most of a visit is reading, not steering. After a few quiet seconds the
  // darkroom drops to 30 fps (the sway is slow, nobody can tell); any input
  // brings back 60 at once.
  const IDLE_AFTER_MS = 8000;
  let idleTimer = 0;
  const wake = () => {
    driver.setMaxFps(60);
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => driver.setMaxFps(30), IDLE_AFTER_MS);
  };
  for (const type of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'focusin'] as const) {
    window.addEventListener(type, wake, { passive: true });
  }
  wake();

  // An open chapter covers the darkroom completely: stop drawing it.
  const setWorldVisible = (visible: boolean) => {
    if (visible === driver.running) return;
    if (visible) {
      surfaces.invalidate?.(); // prints may have changed while paused
      driver.start();
    } else {
      driver.stop();
    }
  };
  const chapters = createChapterController({ root: ui, hub, store, caps, onWorldVisible: setWorldVisible, onHome: () => goHome() });
  onRouteChange((route) => {
    album.close(); // a modal must never outlive the page it was opened on
    void chapters.show(route);
  });
  void chapters.show(parseRoute(location.hash));

  document.body.dataset.view ??= 'hub';
  store.dispatch({ type: 'earn-stamp', id: 'first-light' });
}
