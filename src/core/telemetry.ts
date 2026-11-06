/**
 * Vercel Web Analytics and Speed Insights. Both are no-ops outside a Vercel
 * deployment (they load /_vercel/* scripts that only exist there), cookieless,
 * and loaded after the app so they never sit on the first-frame path.
 */
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

export function startTelemetry(): void {
  if (import.meta.env.DEV) return;
  inject({ mode: 'production' });
  injectSpeedInsights();
}
