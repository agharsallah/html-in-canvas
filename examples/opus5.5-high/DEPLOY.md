# Deploying the Kiosk example

This covers **`examples/opus5.5-high` only**. The rest of the `html-in-canvas` repository (the
root app and the other examples) deploys its own way, and nothing here touches it.

The example is published in two places, independently:

| Where | How | Address |
| --- | --- | --- |
| VPS (ionloft.com) | GitHub release tagged `kiosk-v*`, or `make app-deploy` from `vps-contabo` | https://ionloft.com/html-in-canvas-kiosk/ |
| Cloudflare | `pnpm run deploy` from this folder | https://kiosk-html-in-canvas.gharsallah-abderrahmen.workers.dev |

## ionloft.com

### Release and deploy

From anywhere in the repository:

```sh
gh release create kiosk-v0.2.0 --generate-notes      # next version: see the latest kiosk-v* tag
```

Or in GitHub: Releases → Draft a new release, with a tag starting with `kiosk-v`.

| To… | Run | Or in GitHub |
| --- | --- | --- |
| Release and deploy `main` | `gh release create kiosk-vX.Y.Z --generate-notes` | Releases → Draft a new release, tag `kiosk-v…` |
| Deploy a tag, branch or commit | `gh workflow run deploy-kiosk.yml -f ref=<ref>` | Actions → Deploy kiosk → Run workflow |
| Roll back | `gh workflow run deploy-kiosk.yml -f ref=<older tag>` | the same, with the older tag |
| See deploys | `gh run list --workflow deploy-kiosk.yml` | Actions → Deploy kiosk |
| Find the latest version | `git tag --list 'kiosk-v*' --sort=-v:refname \| head -1` | Releases |

**The tag must start with `kiosk-v`.** A release with any other tag is ignored by this workflow,
so the rest of the repository can release separately. Pre-releases are not deployed.

### What the workflow does

`.github/workflows/deploy-kiosk.yml` at the repository root, run inside this folder:

1. `pnpm install --frozen-lockfile` with this folder's own lockfile.
2. `pnpm build`: the typecheck, then the static build, with `BASE_PATH=/html-in-canvas-kiosk`
   and `SITE_ORIGIN=https://ionloft.com`. A type error stops the deploy.
3. Uploads `dist/` to the server as a new release named by its commit, and makes it live.
4. Fetches the live page and compares it with the `dist/index.html` it just built. If they
   differ, it switches back to the previous release and the run fails.

The server keeps the last five releases, so a rollback is instant.

### How the build works under a path

`vite.config.ts` reads two optional variables. Without them the build is the Cloudflare one,
unchanged:

| Variable | Effect |
| --- | --- |
| `BASE_PATH=/name` | Vite's `base`: every asset, favicon and manifest URL is under `/name/`, and the 404 page's "back" link points at `/name/` (`src/render/not-found.ts`). |
| `SITE_ORIGIN=https://host` | Replaces `brand.url` for the canonical, `og:url` and `og:image` with `https://host/name`. |

`public/site.webmanifest` uses relative URLs, so it works in both places. Keep new URLs
relative to the base: an absolute `/…` link works on Cloudflare and breaks under the path.

`public/_headers` is Cloudflare's format. On ionloft.com, nginx sends its own security headers
(`nosniff`, a referrer policy, a permissions policy, `X-Frame-Options`) and caches
`assets/` for a year.

### Settings

In the repository's **`kiosk`** environment (Settings → Environments → kiosk):

| Name | Kind | Value |
| --- | --- | --- |
| `DEPLOY_SSH_KEY` | secret | private half of this example's deploy key |
| `DEPLOY_HOST`, `DEPLOY_PORT` | variables | the server's address and SSH port |
| `DEPLOY_KNOWN_HOSTS` | variable | the server's pinned host keys (`ssh-keyscan -p <port> <host>`), so a deploy can't be redirected |
| `SITE_URL` | variable | `https://ionloft.com/html-in-canvas-kiosk/`, the page the last step checks |

The deploy key can only upload a release of this example and switch to it: no shell, no other
directory. Its public half, nginx, HTTPS and the server folders are managed by Ansible in the
`vps-contabo` repository (app `html-in-canvas-kiosk` in
`ansible/inventory/group_vars/all/vars.yml`). Its `docs/runbooks/secrets.md` explains how to
rotate the key.

### From your machine

With `vps-contabo` checked out next to this repository:

```sh
cd ../vps-contabo/ansible
make app-deploy APP=html-in-canvas-kiosk                 # this checkout as it is (must be committed)
make app-deploy APP=html-in-canvas-kiosk REF=<ref>       # a tag, branch or commit
make app-rollback APP=html-in-canvas-kiosk               # back to the previous release
make app-status APP=html-in-canvas-kiosk                 # live release and the ones kept
```

It shows what would go live and asks before building. It runs the same install and build as the
workflow, and tags the deployed commit `kiosk-v<next patch>`. Both routes share the releases on
the server.

The whole repository checkout must be committed, not just this folder: `make app-deploy` refuses
to build from a checkout with uncommitted changes. Use `REF=<branch>` to deploy a pushed branch
while other work is in progress.

### Changing the build

The two routes must build the same files. If you change how the example is built (a new
environment variable, another output folder), change it in both:

- `.github/workflows/deploy-kiosk.yml`, and
- the `html-in-canvas-kiosk` entry in `vps-contabo`'s `vars.yml` (`install_cmd`, `build_cmd`,
  `build_env`, `dist_dir`).

## Cloudflare

```sh
pnpm run deploy        # = pnpm build && wrangler deploy
```

Built without `BASE_PATH` or `SITE_ORIGIN`, so it is served at the domain root with
`brand.url` from `src/site.config.ts`. See "Deploy on Cloudflare" in the [README](README.md).
