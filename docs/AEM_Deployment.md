# AEM System — Deployment Guide (Dokploy / Docker on a VPS)

Companion to [AEM_Local_Setup.md](AEM_Local_Setup.md), which covers running the
system on your own machine. This document covers shipping it to a server.

Everything below was verified end-to-end against the real image on 2026-08-09:
migrations applied on boot, both seeds ran inside the container, login through a
simulated reverse proxy issued a `__Secure-` session cookie, and RBAC redirects
behaved (counselor → `/admin` returns `?forbidden=1`, anonymous → `/`).

---

## What ships

| File | Purpose |
|---|---|
| [Dockerfile](../Dockerfile) | Multi-stage production image (`node:24-bookworm-slim`, Next standalone output) |
| [docker-entrypoint.sh](../docker-entrypoint.sh) | Runs `prisma migrate deploy`, then starts the server |
| [docker-compose.prod.yml](../docker-compose.prod.yml) | App + Postgres 16 stack for the VPS |
| [.dockerignore](../.dockerignore) | Keeps `node_modules`, `.next`, and every `.env` out of the build context |
| [app/api/health/route.ts](../app/api/health/route.ts) | `GET /api/health` → `{ ok: true }` / 503. Public, opaque body |
| [docker-compose.yml](../docker-compose.yml) | **Local dev database only.** Not used in production |

> `docker-compose.yml` and `docker-compose.prod.yml` are different stacks. The
> dev one publishes Postgres on `5433` with the password `aem_dev`. Never point
> a deployment at it.

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Compose builds this from `POSTGRES_PASSWORD`. Set it directly if you use a managed database. |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32`. Rotating it invalidates every active session. |
| `AUTH_URL` | ✅ | Canonical public URL, e.g. `https://aem.example.com`. Determines OAuth-style callback redirects **and** whether cookies get the `__Secure-` prefix. Must be `https://` in production. |
| `AUTH_TRUST_HOST` | ✅ | `true`. Auth.js v5 rejects a proxied `Host` header unless this (or `AUTH_URL`) is set — behind Traefik, logins fail silently without it. |
| `POSTGRES_PASSWORD` | ✅ (compose) | `openssl rand -base64 24`. |
| `CRON_SECRET` | recommended | Enables `POST /api/cron/recompute`. Unset ⇒ the endpoint returns 503 rather than defaulting open. |
| `GEMINI_API_KEY` | optional | AI narratives degrade gracefully when absent — the algorithmic rationale still renders. |
| `RUN_MIGRATIONS` | optional | Defaults to `true`. Set `false` to move migrations to a separate deploy step. |
| `PORT` | optional | Defaults to `3000` inside the container. **Not** 3010 — that port is a dev convention only. |

---

## Option A — Dokploy Compose (recommended)

Gives you the app and its database as one unit. Full click-by-click walkthrough
below in [Dokploy step by step](#dokploy-step-by-step).

1. **Dokploy → Create → Compose**, point it at this repository, branch `main`,
   compose file `docker-compose.prod.yml`.
2. **Environment** tab — paste:
   ```
   POSTGRES_PASSWORD=<openssl rand -base64 24>
   AUTH_SECRET=<openssl rand -base64 32>
   AUTH_URL=https://aem.yourdomain.com
   CRON_SECRET=<openssl rand -base64 32>
   GEMINI_API_KEY=<optional>
   ```
3. **Domains** tab — add `aem.yourdomain.com`, service `app`, container port
   `3000`, HTTPS on, Let's Encrypt. Dokploy writes the Traefik labels; that is
   why the compose file carries none of its own.
4. Point the DNS A record at the VPS IP **before** deploying, or the certificate
   challenge fails.
5. **Deploy.** First boot runs every migration, so expect ~30–60s before the
   health check goes green.

**Two Dokploy-specific requirements are already handled in the compose file**,
but they're worth knowing because they're the usual cause of a 404 from Traefik:

- The `app` service joins the external **`dokploy-network`**. Traefik only
  routes to containers it shares a network with, and Dokploy does not attach it
  for you on Compose deployments. `postgres` deliberately stays off that
  network — it's shared with every other app on the box.
- **No `container_name`** is set on any service. Dokploy's logs, metrics, and
  terminal break when a compose service pins its own container name.

Domain labels are read at deploy time, so **changing a domain needs a full
redeploy** — Compose domains do not hot-reload.

## Option B — Dokploy Application (Dockerfile) + a separate database

Use this if you'd rather run Postgres as a Dokploy-managed database service.

1. Create the Postgres service in Dokploy first; copy its internal connection
   string.
2. **Create → Application**, build type **Dockerfile**, path `./Dockerfile`.
3. Environment: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST=true`,
   `CRON_SECRET`, `GEMINI_API_KEY`.
4. Domain → port `3000`. Same DNS-first rule.

The entrypoint still runs `prisma migrate deploy`, so nothing else is needed.

## Option C — plain compose on the VPS

```bash
git clone <repo-url> aem-system && cd aem-system
cat > .env <<'EOF'
POSTGRES_PASSWORD=…
AUTH_SECRET=…
AUTH_URL=https://aem.yourdomain.com
CRON_SECRET=…
EOF
# The compose file expects dokploy-network to exist (Dokploy's installer makes
# it). Without Dokploy, create it once — or delete the network block entirely:
docker network create dokploy-network
# Uncomment the `ports:` block under `app:`, then put nginx/Caddy in front.
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Dokploy step by step

Assumes a fresh KVM VPS and a domain whose DNS you control.

### 0. Prerequisites

- Code committed and **pushed** — Dokploy builds from the git remote, not from
  your laptop.
- DNS **A record** for `aem.yourdomain.com` → the VPS IP, created first. Let's
  Encrypt validates over HTTP; if the record hasn't propagated, the certificate
  fails and you'll be redeploying to retry. Confirm with
  `dig +short aem.yourdomain.com`.
- Ports 80 and 443 open on the VPS firewall.

### 1. Install Dokploy on the VPS

```bash
ssh root@<vps-ip>
curl -sSL https://dokploy.com/install.sh | sh
```

Then open `http://<vps-ip>:3000` and create the admin account **immediately** —
that page is unauthenticated until someone registers. This installs Traefik and
creates `dokploy-network`.

### 2. Connect the git provider

**Settings → Git** → GitHub → install the Dokploy GitHub App, granting access to
the `aem-system` repository. (A private repo over plain HTTPS will fail to clone
otherwise.)

### 3. Create the project and Compose service

**Projects → Create Project** (`aem-system`) → **Create Service → Compose**.

In **General**:

| Field | Value |
|---|---|
| Provider | GitHub |
| Repository | `aem-system` |
| Branch | `main` |
| Compose Path | `./docker-compose.prod.yml` |
| Compose Type | Docker Compose |

### 4. Environment variables

**Environment** tab — these feed `${…}` substitution in the compose file. All
four are required; the compose file fails fast rather than starting half-configured.

```
POSTGRES_PASSWORD=<openssl rand -base64 24>
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://aem.yourdomain.com
CRON_SECRET=<openssl rand -base64 32>
GEMINI_API_KEY=
```

`AUTH_URL` must be the **`https://`** URL, exactly as users will type it. It
decides both the post-login redirect target and whether the session cookie gets
the `__Secure-` prefix.

### 5. Domain

**Domains → Add Domain**:

| Field | Value |
|---|---|
| Host | `aem.yourdomain.com` |
| Service Name | `app` |
| Container Port | `3000` |
| Path | `/` |
| HTTPS | on |
| Certificate Provider | Let's Encrypt |

### 6. Deploy

Hit **Deploy** and watch the logs. A healthy first run shows, in order:

```
[entrypoint] applying database migrations…
… 13 migrations applied …
[entrypoint] migrations up to date
▲ Next.js 16.2.4  -  Network: http://0.0.0.0:3000  ✓ Ready
```

Give it 30–60s, then `curl -fsS https://aem.yourdomain.com/api/health` should
return `{"ok":true}`.

### 7. Seed

**Terminal** tab on the `app` service (or SSH in and `docker exec`):

For a server real staff will log into, seed only the bootstrap admin:

```bash
SEED_ADMIN_ONLY=true npm run db:seed
```

That creates one ADMIN and the AlgorithmConfig the risk engine reads — nothing
else. No school year, no demo accounts, no invented students. The account is
flagged `mustChangePassword`, so the first sign-in is funnelled to
`/change-password` before any other page loads; pass `SEED_ADMIN_PASSWORD` to
avoid using the repo default even once. From there: `/admin/setup` to create
the school year, then `/admin/import` for the staff, roster and assignment
CSVs.

For a demo or thesis-defence deployment where you want the analytics populated:

```bash
npm run db:seed        # 5 demo accounts on published passwords + a school year
npm run db:seed:demo   # optional 3-year simulation dataset, ~21s
```

Those two mint credentials that are printed in this repo. **Change them before
you share the URL** — see the warning below.

### 8. Schedule the recompute (optional)

**Dokploy → Schedules** (or a host crontab), daily at 02:00:

```bash
curl -fsS -X POST https://aem.yourdomain.com/api/cron/recompute \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Troubleshooting

| Symptom | Cause |
|---|---|
| Traefik 404 on the domain | `app` not on `dokploy-network`, or the Domain's service name isn't `app` / port isn't `3000`. Redeploy after fixing — Compose domain labels don't hot-reload. |
| Login form reloads, no session | `AUTH_URL` / `AUTH_TRUST_HOST` missing or `AUTH_URL` set to `http://`. |
| Certificate never issues | DNS not resolving to the VPS yet, or 80/443 blocked. |
| Build OOMs | `next build` on a 2-vCPU box is tight. Add swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`. |
| `POSTGRES_PASSWORD is required` | The Environment tab is empty or was saved after the deploy started. |
| Logs/terminal tab empty | A `container_name` got added to a compose service. Remove it. |

---

## Seeding data on the server

**This is the part you asked about.** There are three seed-ish scripts, all in
the repo, all runnable inside the container:

| Script | npm script | What it does |
|---|---|---|
| [prisma/seed.ts](../prisma/seed.ts) | `npm run db:seed` | **Baseline.** 1 SY (2025-2026, active), 2 sections (9-Newton, 9-Curie), 5 subjects, 5 staff accounts, 10 students incl. Maria Santos, `AlgorithmConfig` v1. ~2s. |
| [scripts/seed-demo.ts](../scripts/seed-demo.ts) | `npm run db:seed:demo` | **The simulation dataset.** 3 school years (2023-24 → 2025-26) of a G7→G8→G9 cohort, 6 demo sections × 40 students, grades/attendance/behavioral records, SEL assessments, demo interventions and counseling notes, then runs the risk engine per year. ~21s, ~730 risk assessments. |
| [scripts/reset-to-data-only.ts](../scripts/reset-to-data-only.ts) | `npm run db:reset:data` | Wipes algorithm output + workflow + audit log, keeps people and raw data. For replaying a demo. |

`seed-demo` **requires `db:seed` to have run first** — it reuses the active
school year and the `AlgorithmConfig` the baseline creates. Both are idempotent
(deterministic keys + upserts), so re-running is safe.

```bash
# Dokploy: Terminal tab on the app service, or over SSH —
docker compose -f docker-compose.prod.yml exec app npm run db:seed
docker compose -f docker-compose.prod.yml exec app npm run db:seed:demo

# Plain docker:
docker exec -it <app-container> npm run db:seed:demo
```

Related runners in the same image: `npm run risk:run`
([scripts/run-risk-engine.ts](../scripts/run-risk-engine.ts) — recompute the
active year by hand) and the `scripts/verify-*.ts` suite.

### ⚠️ Seed accounts are public credentials

`db:seed` creates `admin@school.edu / admin123` and four siblings;
`db:seed:demo` creates eleven teacher accounts on `demo123`. Once the app is on
a public domain, **anyone who has read the repo can log in as your admin.**

Before or immediately after seeding a public deployment, do one of:

- **Change every seeded password** — Admin → Users, or a one-off `bcrypt.hash`
  update against the database; or
- **Keep the deployment private** — Dokploy/Traefik basic-auth middleware or an
  IP allow-list in front of the domain, which is the right call for a defense
  or thesis demo; or
- **Don't seed production at all** — create real accounts through Admin → Users
  and import a roster via the CSV wizard.

---

## Scheduled risk recompute

The engine does not run itself. Add a host crontab entry (or a Dokploy
scheduled task) once `CRON_SECRET` is set:

```cron
0 2 * * * curl -fsS -X POST https://aem.yourdomain.com/api/cron/recompute \
            -H "Authorization: Bearer $CRON_SECRET"
```

Scheduled runs always target the active school year and never notify — the
in-app notification path is the admin "Run engine" button, by design.

---

## Backups

The only stateful thing is the Postgres volume (`aem_pgdata`).

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U aem aem | gzip > aem-$(date +%F).sql.gz
```

Worth a nightly cron plus off-server copies. `AuditLog` is append-only via a
Postgres trigger and is evidence for the governance claims in the spec — losing
it loses the audit trail.

---

## Known constraints

- **Single instance only.** The login throttle in
  [lib/rate-limit.ts](../lib/rate-limit.ts) is in-process, and Next's ISR cache
  is on local disk. Scaling past one replica needs a Redis-backed limiter and a
  shared cache handler first. One instance is ample for a school-sized load.
- **Image is ~1.8 GB.** It deliberately carries the full `node_modules` so
  `prisma migrate deploy`, `tsx`, the seeds, and the `verify-*` scripts all run
  inside the container. To trade that away for a ~250 MB image, drop the
  `node_modules` / `scripts` / `lib` / `prisma` copies from the `runner` stage
  and set `RUN_MIGRATIONS=false`, then run migrations and seeds from a separate
  tooling container.
- **No CSP.** `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`
  are set in [next.config.ts](../next.config.ts). A Content-Security-Policy needs
  nonce plumbing through the Next runtime and is not wired up.
- **`GEMINI_API_KEY` unset is a supported state,** not a broken one — AI
  narratives are skipped and every surface falls back to the algorithmic
  explanation.

---

## Post-deploy smoke test

1. `curl -fsS https://aem.yourdomain.com/api/health` → `{"ok":true}`
2. Log in as each of the four roles; confirm each lands on its own dashboard.
3. As counselor, request `/admin` → redirected to `/?forbidden=1`.
4. Log out, request `/principal/dashboard` → redirected to `/?from=…`.
5. Admin → Algorithm → Run engine; confirm risk scores render **with** their
   factor breakdown.
6. Walk [AEM_Scenario_Maria.md](AEM_Scenario_Maria.md) end to end.
