# AEM System

**Algorithmic Educational Management** — a high school student-support and
intervention-planning platform. Risk scoring, multi-scope pattern detection, and
recommendation drafting, wrapped in explainability and governance: every
algorithmic output ships with its factor breakdown, every write is audited, and
sensitive fields are filtered at the query layer rather than by hiding UI.

Four roles — Admin, Teacher, Counselor, Principal — each with its own workspace
and its own view of the same data.

## Stack

Next.js 16.2.4 (App Router) · React 19.2.4 · TypeScript · Prisma 7 +
`@prisma/adapter-pg` · PostgreSQL 16 · Auth.js v5 (JWT) · Tailwind v4 · Zod 4 ·
Gemini (optional, degrades gracefully).

## Quick start

```bash
npm install
cp .env.example .env          # then set AUTH_SECRET: openssl rand -base64 32
npm run db:up                 # Postgres 16 in Docker on :5433
npm run db:migrate
npm run db:seed               # baseline: 5 accounts, 10 students
npm run db:seed:demo          # optional: 3 school years of simulation data
npm run dev                   # http://localhost:3010
```

Log in as `admin@school.edu` / `admin123` (dev seed — see the setup guide for
the other four accounts).

Full walkthrough: **[docs/AEM_Local_Setup.md](docs/AEM_Local_Setup.md)**.

## Deployment

Ships with a production Dockerfile and compose stack, aimed at Dokploy on a VPS.
Migrations run on container start; the seeds run inside the container.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Read **[docs/AEM_Deployment.md](docs/AEM_Deployment.md)** first — in particular
the `AUTH_URL` / `AUTH_TRUST_HOST` requirement (logins fail silently without
them behind a reverse proxy) and the warning about seeded credentials on a
public domain.

## Documentation

| Document | What it covers |
|---|---|
| [AEM_System_Specification.md](docs/AEM_System_Specification.md) | What the system is. Every feature traces back to this. |
| [AEM_FLOW.md](docs/AEM_FLOW.md) | Page map, user flows, role visibility matrix |
| [AEM_Algorithm.md](docs/AEM_Algorithm.md) | Risk scoring, pattern rules, recommendations |
| [AEM_Scenario_Maria.md](docs/AEM_Scenario_Maria.md) | End-to-end reference scenario / regression checklist |
| [AEM_Development_Phases.md](docs/AEM_Development_Phases.md) | Build order and current status |
| [AEM_Local_Setup.md](docs/AEM_Local_Setup.md) | Getting it running on your machine |
| [AEM_Deployment.md](docs/AEM_Deployment.md) | Shipping it to a server |
| [CLAUDE.md](CLAUDE.md) | Conventions and contribution contract |
