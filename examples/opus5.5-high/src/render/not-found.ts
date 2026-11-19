/**
 * The 404 page, emitted at build time by vite.config.ts so its "back" link points at the base the
 * build is served from (the domain root on Cloudflare, /<path>/ under a sub-path).
 */
export function renderNotFound(home: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Not found · Plaza Week</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f2ede2;color:#16130f;font:600 1.1rem/1.5 system-ui,sans-serif;text-align:center}h1{font-size:clamp(4rem,18vw,12rem);margin:0;line-height:.85;letter-spacing:-.06em}h1 span{color:#e2412b}a{color:inherit;text-decoration-thickness:3px}</style></head>
<body><main><h1>40<span>4</span></h1><p>This poster was taken down. <a href="${home}">Back to the plaza</a></p></main></body></html>
`;
}
