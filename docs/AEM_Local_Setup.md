# AEM System — Local Setup Guide

Step-by-step instructions for getting the AEM System running from scratch on a new machine.

---

## Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| **Git** | any recent | `git --version` |
| **Node.js** | 20.9+ | `node -v` |
| **Docker Desktop** | any recent | `docker -v` |
| **npm** | bundled with Node | `npm -v` |

> Docker Desktop must be **running** (the Docker daemon must be up) before you start the database step.

---

## 1. Clone the repository

```bash
git clone <repo-url> aem-system
cd aem-system
```

---

## 2. Install dependencies

```bash
npm install
```

> `postinstall` automatically runs `prisma generate` — you'll see Prisma client generation output. That's expected.

---

## 3. Create your `.env` file

The repo ships a `.env.example` template. Copy it and fill in the two required values:

```bash
cp .env.example .env
```

Then open `.env` and set `AUTH_SECRET` to a real random string:

```bash
# Generate a secret (run this in your terminal, paste the output into .env)
openssl rand -base64 32
```

Your `.env` should look like this when done:

```env
DATABASE_URL="postgresql://aem:aem_dev@localhost:5433/aem?schema=public"
AUTH_SECRET="<paste the generated value here>"
```

> `DATABASE_URL` is already correct for the local Docker setup — don't change it unless you're using a different database.  
> Never commit `.env` — it is listed in `.gitignore`.

---

## 4. Start the database (Docker)

```bash
npm run db:up
```

This starts a **PostgreSQL 16** container named `aem-postgres` on **port 5433** with a persistent volume `aem_pgdata`.

Verify it's running:

```bash
docker ps
# Should show: aem-postgres   postgres:16-alpine   Up ...
```

---

## 5. Run migrations

```bash
npm run db:migrate
```

This applies all Prisma migrations to the fresh database, creating the full schema. When prompted for a migration name (only on first run if there are pending migrations), press **Enter** to accept the default or type a short name.

---

## 6. Seed the database

```bash
npm run db:seed
```

This populates the database with the development baseline:

| What | Detail |
|---|---|
| School year | SY 2025-2026 (active) |
| Sections | 9-Newton, 9-Curie |
| Subjects | MATH9, ENG9, SCI9, AP9, FIL9 |
| Users | 5 accounts (see table below) |
| Students | Maria Santos + others enrolled in 9-Newton / 9-Curie |
| Grades, Attendance, Behavioral records | Populated for algorithm testing |
| Algorithm config | Default weights |

### Seed accounts

| Email | Password | Role |
|---|---|---|
| `admin@school.edu` | `admin123` | ADMIN |
| `teacher@school.edu` | `teacher123` | TEACHER |
| `adviser@school.edu` | `adviser123` | TEACHER (adviser of 9-Newton) |
| `counselor@school.edu` | `counselor123` | COUNSELOR |
| `principal@school.edu` | `principal123` | PRINCIPAL |

> The seed is **idempotent** — safe to run multiple times. It uses `upsert` for every record.

---

## 6b. (Optional) Load the demo / simulation dataset

`db:seed` gives you the minimum needed to log in. For dashboards, cohort views,
and pattern detection to have anything to show, load the demo dataset on top:

```bash
npm run db:seed:demo     # scripts/seed-demo.ts
```

| What | Detail |
|---|---|
| School years | SY 2023-2024, SY 2024-2025, SY 2025-2026 (active) — one cohort progressing G7 → G8 → G9 |
| Sections | 2 per grade level per year (Aristotle/Bacon, Darwin/Einstein, Faraday/Galileo) |
| Students | 40 per section, ~250 active enrollments in the current year |
| Per-enrollment data | Grades, attendance, behavioral records, SEL assessments |
| Workflow | Demo interventions (one per scope, closed with outcomes) + counseling notes |
| Algorithm | Risk engine run per year — ~730 assessments, patterns and recommendation drafts materialised |

Takes ~20–30s. Also idempotent (deterministic keys, seeded PRNG). Prints eleven
extra demo teacher/adviser logins at the end, all on the password `demo123`.

> Run `db:seed` **first** — the demo script reuses the active school year and
> the `AlgorithmConfig` that the baseline creates.

---

## 7. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3010](http://localhost:3010) in your browser. Log in with any seed account above.

---

## Daily workflow

```bash
# Start database (if Docker Desktop was restarted)
npm run db:up

# Start dev server
npm run dev
```

The database volume (`aem_pgdata`) persists across Docker restarts — you don't need to re-seed unless you explicitly wipe it.

---

## Reset to data-only baseline

Use this when you want to **replay the full workflow** (run engine → see patterns → build interventions → close with outcomes) without re-importing students or losing accounts.

### What it does

| Keeps | Wipes |
|---|---|
| Users, SchoolYears, Sections, Subjects | RiskAssessment, RiskOverride |
| TeacherAssignments, Students, ConsentRecords | PatternMatch, RecommendationDraft |
| StudentEnrollments, Grades, Attendance | Interventions (all child tables) |
| BehavioralRecords, AlgorithmConfig | CounselingNote, AICache, AuditLog |

### Run it

```bash
npx tsx scripts/reset-to-data-only.ts
```

The script prints a `BEFORE` and `AFTER` count table so you can confirm what was wiped. It is **idempotent** — running it twice is safe.

After reset, log in as admin and run the risk engine to regenerate scores:

1. `admin@school.edu` → Algorithm → Run engine
2. `counselor@school.edu` → Caseload → open a student → build intervention
3. `principal@school.edu` → Approvals queue / Override / Dashboard
4. `teacher@school.edu` → Daily capture / Intervention feedback
5. `adviser@school.edu` → Adviser-elevation features for 9-Newton

---

## Full database reset (nuclear option)

Drops all tables, re-runs every migration from scratch, and re-seeds:

```bash
npm run db:reset
```

> This is destructive and wipes **everything**. Use `reset-to-data-only` for routine workflow resets.

---

## Useful commands reference

```bash
npm run db:up          # Start Postgres container
npm run db:down        # Stop Postgres container
npm run db:migrate     # Apply pending migrations
npm run db:seed        # Seed / re-seed the baseline (prisma/seed.ts)
npm run db:seed:demo   # Load the 3-year demo dataset (scripts/seed-demo.ts)
npm run db:reset:data  # Reset to data baseline (scripts/reset-to-data-only.ts)
npm run db:reset       # Nuclear reset (drop + migrate + seed)
npm run db:deploy      # Apply migrations without prompting (production path)
npm run db:studio      # Open Prisma Studio at localhost:5555
npm run risk:run       # Recompute risk for the active year (scripts/run-risk-engine.ts)
npm run dev            # Start dev server at localhost:3010
npm run build          # Production build
npx tsc --noEmit       # Type-check
npm run lint           # ESLint
```

Deploying to a server? See [AEM_Deployment.md](AEM_Deployment.md).
