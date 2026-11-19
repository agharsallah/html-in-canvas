/**
 * Vercel Web Analytics and Speed Insights: cookieless, and loaded after the app so they never
 * sit on the first-frame path. Their collectors are /_vercel/* scripts that exist only on a
 * Vercel deployment, so anywhere else (ionloft.com, a fork, `vite preview`) nothing is loaded:
 * they would be two 404s on every page.
 */
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

export const onVercel = (hostname: string): boolean => hostname.endsWith('.vercel.app');

export function startTelemetry(): void {
  if (import.meta.env.DEV || !onVercel(window.location.hostname)) return;
  inject({ mode: 'production' });
  injectSpeedInsights();
}
