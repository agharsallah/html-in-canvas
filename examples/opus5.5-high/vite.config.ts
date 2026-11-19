import { defineConfig, loadEnv, type Plugin } from 'vite';
import { site, type SiteConfig } from './src/site.config';
import { renderBody, renderHead } from './src/render/page';
import { renderNotFound } from './src/render/not-found';

/** Pre-renders every section from site.config.ts into index.html (dev and build). */
function kioskPrerender(served: SiteConfig): Plugin {
  return {
    name: 'kiosk-prerender',
    transformIndexHtml(htmlText) {
      return htmlText
        .replace('<html lang="en">', `<html lang="${served.brand.locale}">`)
        .replace('<!--kiosk:head-->', renderHead(served))
        .replace('<!--kiosk:body-->', renderBody(served));
    },
  };
}

/** 404.html, with its "back" link on the base the build is served from. */
function notFound(base: string): Plugin {
  return {
    name: 'kiosk-404',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '404.html', source: renderNotFound(base) });
    },
  };
}

/**
 * Where the build is served. Cloudflare serves it at the domain root (the defaults). Under a
 * path, build with BASE_PATH=/name, and SITE_ORIGIN=https://host for the canonical and share
 * URLs, e.g. BASE_PATH=/html-in-canvas-kiosk SITE_ORIGIN=https://ionloft.com pnpm build.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ['BASE_PATH', 'SITE_ORIGIN']);
  const basePath = (env.BASE_PATH ?? '').replace(/^\/+|\/+$/g, '');
  const base = basePath ? `/${basePath}/` : '/';
  const served: SiteConfig = env.SITE_ORIGIN
    ? { ...site, brand: { ...site.brand, url: `${env.SITE_ORIGIN.replace(/\/+$/, '')}${base.slice(0, -1)}` } }
    : site;

  return {
    base,
    plugins: [kioskPrerender(served), notFound(base)],
    worker: { format: 'es' },
    build: { target: 'es2023', assetsInlineLimit: 0 },
  };
});
