# Deploying Drawable (the course)

This covers **the course at the repository root**: the darkroom (`index.html`) and the field
guide (`guide.html`). The examples in `examples/` deploy their own way. The Kiosk example has
its own [`examples/opus5.5-high/DEPLOY.md`](examples/opus5.5-high/DEPLOY.md).

The course is published in two places, independently:

| Where | How | Address |
| --- | --- | --- |
| VPS (ionloft.com) | GitHub release tagged `learn-v*`, or `make app-deploy` from `vps-contabo` | https://ionloft.com/learn-html-in-canvas/ (guide: `…/guide`) |
| Vercel | Vercel's own project settings (`vercel.json`) | https://htmlincanvas.vercel.app |

## ionloft.com

### Release and deploy

From anywhere in the repository:

```sh
gh release create learn-v0.2.0 --generate-notes      # next version: see the latest learn-v* tag
```

Or in GitHub: Releases → Draft a new release, with a tag starting with `learn-v`.

| To… | Run | Or in GitHub |
| --- | --- | --- |
| Release and deploy `main` | `gh release create learn-vX.Y.Z --generate-notes` | Releases → Draft a new release, tag `learn-v…` |
| Deploy a tag, branch or commit | `gh workflow run deploy-learn.yml -f ref=<ref>` | Actions → Deploy learn → Run workflow |
| Roll back | `gh workflow run deploy-learn.yml -f ref=<older tag>` | the same, with the older tag |
| See deploys | `gh run list --workflow deploy-learn.yml` | Actions → Deploy learn |
| Find the latest version | `git tag --list 'learn-v*' --sort=-v:refname \| head -1` | Releases |

**The tag must start with `learn-v`.** A release with any other tag (`kiosk-v*` is the Kiosk
example) is ignored by this workflow. Pre-releases are not deployed.

### What the workflow does

`.github/workflows/deploy-learn.yml`:

1. `pnpm install --frozen-lockfile`.
2. `pnpm test`: a failing test stops the deploy.
3. `pnpm typecheck && pnpm exec vite build`, the same build as Vercel's `buildCommand`, with
   `BASE_PATH=/learn-html-in-canvas` and `SITE_ORIGIN=https://ionloft.com`.
4. Uploads `dist/` to the server as a new release named by its commit, and makes it live.
5. Fetches the live page and compares it with the `dist/index.html` it just built. If they
   differ, it switches back to the previous release and the run fails.

The server keeps the last five releases, so a rollback is instant.

It doesn't run the bundle budget (`scripts/check-budget.mjs`), and neither does Vercel. On
19 Nov 2026 eight chapter chunks were over their 12 kB budget on `main`, so `pnpm build` fails
there; fix the budget or the chunks before adding it to a deploy.

### How the build works under a path

`vite.config.ts` reads two optional variables. Without them the build is the Vercel one,
unchanged:

| Variable | Effect |
| --- | --- |
| `BASE_PATH=/name` | Vite's `base`: every asset, favicon and manifest URL is under `/name/`. |
| `SITE_ORIGIN=https://host` | Replaces `https://htmlincanvas.vercel.app` in both pages' canonical and share tags with `https://host/name`. |

The link to the guide is relative (`guide.html`), and `public/site.webmanifest` uses relative
URLs, so both work in either place. nginx answers `…/guide` with `guide.html`, as Vercel's
`cleanUrls` does. Keep new URLs relative to the base: an absolute `/…` link works on Vercel and
breaks under the path.

Vercel Analytics and Speed Insights load only on `*.vercel.app` (`src/core/telemetry.ts`).
Their collectors exist only there, so on ionloft.com nothing is measured or requested.
`public/robots.txt` and `public/sitemap.xml` name the Vercel address; under a path nobody reads
them.

### Settings

In the repository's **`learn`** environment (Settings → Environments → learn):

| Name | Kind | Value |
| --- | --- | --- |
| `DEPLOY_SSH_KEY` | secret | private half of the course's deploy key |
| `DEPLOY_HOST`, `DEPLOY_PORT` | variables | the server's address and SSH port |
| `DEPLOY_KNOWN_HOSTS` | variable | the server's pinned host keys (`ssh-keyscan -p <port> <host>`), so a deploy can't be redirected |
| `SITE_URL` | variable | `https://ionloft.com/learn-html-in-canvas/`, the page the last step checks |

The deploy key can only upload a release of the course and switch to it: no shell, no other
directory. Its public half, nginx, HTTPS and the server folders are managed by Ansible in the
`vps-contabo` repository (app `learn-html-in-canvas` in
`ansible/inventory/group_vars/all/vars.yml`). Its `docs/runbooks/secrets.md` explains how to
rotate the key.

### From your machine

With `vps-contabo` checked out next to this repository:

```sh
cd ../vps-contabo/ansible
make app-deploy APP=learn-html-in-canvas                 # this checkout as it is (must be committed)
make app-deploy APP=learn-html-in-canvas REF=<ref>       # a tag, branch or commit
make app-rollback APP=learn-html-in-canvas               # back to the previous release
make app-status APP=learn-html-in-canvas                 # live release and the ones kept
```

It shows what would go live and asks before building. It runs the same tests and build as the
workflow, and tags the deployed commit `learn-v<next patch>`. Both routes share the releases on
the server. With uncommitted work in the checkout, deploy a pushed branch with `REF=main`.

### Changing the build

The two routes must build the same files. If you change how the course is built, change it in
both:

- `.github/workflows/deploy-learn.yml`, and
- the `learn-html-in-canvas` entry in `vps-contabo`'s `vars.yml` (`test_cmd`, `build_cmd`,
  `build_env`, `dist_dir`).
