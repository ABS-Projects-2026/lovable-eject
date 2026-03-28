# lovable-eject

Migrate Lovable.dev projects to free-tier hosting — one command, zero manual edits.

<!-- badges -->
![npm version](https://img.shields.io/npm/v/lovable-eject)
![license](https://img.shields.io/npm/l/lovable-eject)
![tests](https://img.shields.io/github/actions/workflow/status/ABS-Projects-2026/lovable-eject/ci.yml?label=tests)

---

## Why

Lovable.dev charges £22/month. When you're ready to leave, you'll find proprietary auth wrappers baked into your code, SQL migrations that break on a fresh Supabase instance, and zero documentation on how to decouple. Nobody has automated this — until now.

`lovable-eject` scans your project, rewrites the proprietary bits, fixes your migrations, and walks you through deploying to Vercel + your own Supabase. The whole process takes minutes, not days.

## Quick Start

```bash
# 1. Analyse — read-only scan, safe to run anytime
npx lovable-eject analyse ./my-lovable-project

# 2. Transform — rewrite code, fix SQL, remove Lovable deps
npx lovable-eject transform ./my-lovable-project

# 3. Deploy — interactive Supabase + Vercel walkthrough
npx lovable-eject deploy ./my-lovable-project
```

## What It Does

| Command | What happens |
|---------|-------------|
| `analyse` | Scans dependencies, file references (imports, OAuth, deep links, OG images), SQL migration issues, Supabase schema, Capacitor config. Outputs a risk score: **simple**, **moderate**, or **complex**. |
| `transform` | Runs 10 automated fixes with full backup. Removes Lovable deps, replaces OAuth calls, fixes migrations, strips tagger, cleans domain refs, generates `.env.example` + `vercel.json` + health endpoint. |
| `deploy` | Interactive guide: link Supabase project, push migrations, configure Vercel env vars, set up DNS, verify with health check, set up UptimeRobot monitoring. |

## Web UI

A local dashboard for the full workflow — analyse, transform with live code diffs, and deploy.

```bash
npm run web    # Starts API (5174) + UI (5175)
```

Open [localhost:5175](http://localhost:5175) to:

- **Analyse** your project with a visual risk assessment and grouped findings
- **Transform** with one click, watching each step complete with before/after code previews
- **Deploy** with an interactive checklist, copy-to-clipboard env vars, and health check

<!-- screenshot-dashboard.png -->

<!-- screenshot-transform.png -->

## Flags

| Flag | Command | Description |
|------|---------|-------------|
| `--json` | `analyse` | Output results as JSON |
| `--report` | `analyse` | Generate an HTML report and open in browser |
| `--dry-run` | `transform` | Preview changes without modifying files |
| `--no-backup` | `transform` | Skip creating `.bak` backup files |

## What Gets Transformed

| Find | Replace |
|------|---------|
| `@lovable.dev/cloud-auth-js` in package.json | Removed |
| `@lovable.dev/sdk` in package.json | Removed |
| `lovable-tagger` in package.json + vite config | Removed |
| `src/integrations/lovable/` folder | Deleted |
| `import { lovable } from '@/integrations/lovable'` | `import { supabase } from '@/integrations/supabase/client'` |
| `lovable.auth.signInWithOAuth(provider, { redirect_uri })` | `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })` |
| `lovable.auth.*` calls | `supabase.auth.*` |
| `CREATE TABLE` without `IF NOT EXISTS` | `CREATE TABLE IF NOT EXISTS` |
| `DROP FUNCTION IF EXISTS` without `CASCADE` | Adds `CASCADE` |
| `jsonb_set(col, ...)` without null guard | `jsonb_set(COALESCE(col, '{}'::jsonb), ...)` |
| `app.lovable.<UUID>` (Capacitor app ID) | `com.yourapp.name` placeholder |
| `*.lovable.app` domain references | `YOUR_DOMAIN.com` placeholder |
| `lovable.dev/opengraph-image*` URLs | `YOUR_DOMAIN.com/og-image.png` placeholder |
| `mode === 'development' && componentTagger()` | Removed |
| *(generates)* `.env.example` | Supabase env var template |
| *(generates)* `vercel.json` | SPA rewrite rules + API cache headers |
| *(generates)* `api/health.js` | Keep-alive endpoint for monitoring |

## Development

```bash
git clone https://github.com/ABS-Projects-2026/lovable-eject.git
cd lovable-eject
npm install
npm test                                     # Run tests (vitest)
npm run build                                # Compile to dist/
npm run dev -- analyse ./path/to/project     # Run in dev mode
npm run web                                  # Start web UI
```

### Project Structure

```
src/
  cli.ts              — Entry point, Commander setup
  commands/           — analyse, transform, deploy
  analysers/          — Dependency, reference, migration, schema, capacitor, risk
  transforms/         — 8 transform modules (deps, oauth, tagger, migrations, etc.)
  utils/              — File helpers, logger, report generator
web/
  server.ts           — Express API (analyse, transform, deploy endpoints)
  src/                — React + Tailwind dashboard
tests/                — Mirrors src/ structure, vitest
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## License

[MIT](LICENSE)
