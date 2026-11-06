/**
 * Railway engines: one interface, two implementations.
 *
 *  simulated: the pure model in sim.ts, driven by animation frames.
 *  native:    a real worker with a real OffscreenCanvas (native-engine.ts).
 *
 * Both report the same RailEvents, so the lab, the 3D yard and the ledger
 * never need to know which one is running.
 */
import { throttledLoop } from '../../ui/fx/loop';
import { advanceRail, createRailState, inFlight, sweepRail, type RailEvent, type RailSettings } from './sim';

export interface RailStats {
  open: number;
  inFlight: number;
  latency: number | null;
  late: number;
  draws: number;
  geometryEvents: number;
}

export interface RailEngine {
  readonly native: boolean;
  set(settings: RailSettings): void;
  /** Close every image the worker kept without closing. */
  sweep(): void;
  stats(): RailStats;
  destroy(): void;
}

export type RailListener = (event: RailEvent) => void;

/** Longest stretch of model time one animation frame may advance (tab switches). */
const MAX_STEP_MS = 100;

export function createSimEngine(initial: RailSettings, listener: RailListener): RailEngine {
  const state = createRailState();
  let settings = initial;
  let modelTime = 0;
  let last = performance.now();
  let drawn = false;

  const stop = throttledLoop(60, (now) => {
    modelTime += Math.min(MAX_STEP_MS, now - last);
    last = now;
    for (const event of advanceRail(state, settings, modelTime)) {
      if (event.kind === 'draw') drawn = true;
      listener(event);
    }
  });

  return {
    native: false,
    set: (next) => (settings = next),
    sweep: () => sweepRail(state).forEach(listener),
    stats: () => ({
      open: state.open.size,
      inFlight: inFlight(state),
      latency: drawn ? state.lastLatency : null,
      late: state.late,
      draws: state.draws,
      geometryEvents: state.geometryEvents,
    }),
    destroy: stop,
  };
}
