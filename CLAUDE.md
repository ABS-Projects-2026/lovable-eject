# lovable-eject

## WHAT

CLI tool that automates migration of Lovable.dev projects to free-tier hosting (Vercel + self-managed Supabase). Runs via `npx lovable-eject <command>`. Three commands: `analyse`, `transform`, `deploy`.

## WHY

Lovable.dev charges £22/month. Users who want to leave face proprietary auth wrappers, broken migration SQL, and no documentation. Nothing exists to automate this. We fill that gap.

## HOW

### Tech Stack
- Node.js CLI (TypeScript, compiled to JS)
- Commander.js for CLI commands
- ts-morph for safe AST-based code transforms
- chalk + ora for terminal output
- Inquirer.js for interactive prompts

### Project Structure
```
src/
  cli.ts              — Entry point, Commander setup
  commands/           — analyse.ts, transform.ts, deploy.ts
  analysers/          — Individual analysis modules (deps, migrations, supabase, capacitor)
  transforms/         — Individual transform modules (auth, deps, migrations, config)
  utils/              — Shared helpers (file scanning, SQL parsing, logging)
tests/                — Mirrors src/ structure
tasks/                — todo.md + lessons.md (living docs)
```

### Build & Test
```bash
npm run build        # tsc → dist/
npm run dev          # ts-node src/cli.ts
npm test             # vitest
npm run lint         # eslint
```

### Every Lovable Project Has
- React + Vite + Tailwind + shadcn/ui frontend
- Supabase backend (PostgreSQL + Auth + Storage)
- `src/integrations/supabase/client.ts` with env vars
- `src/integrations/lovable/index.ts` with OAuth wrapper
- `@lovable.dev/cloud-auth-js` + `lovable-tagger` in package.json
- `supabase/migrations/` folder with SQL files
- Deep link scheme: `app.lovable.<UUID>`
- OG image: `https://lovable.dev/opengraph-image-*.png`

### Key Migration Patterns
| Find | Replace |
|------|---------|
| `@lovable.dev/cloud-auth-js` | Remove from package.json |
| `lovable-tagger` | Remove from package.json + vite config |
| `src/integrations/lovable/` | Delete entire folder |
| Lovable OAuth calls | Standard Supabase `signInWithOAuth` |
| `app.lovable.<UUID>` | User's Capacitor appId |
| `*.lovable.app` domain | User's custom domain |

### SQL Migration Fixes
- Add `IF NOT EXISTS` to `CREATE TABLE`
- Add `CASCADE` to `DROP FUNCTION IF EXISTS`
- Wrap `jsonb_set` with `COALESCE(col, '{}'::jsonb)`
- Flag invalid enum values

## RULES

- Plan before implementing any non-trivial feature
- Write tests alongside implementation (TDD preferred)
- Update tasks/todo.md when starting/completing work
- Capture mistakes in tasks/lessons.md
- Keep functions small and single-purpose
- Use descriptive error messages — our users aren't DevOps experts
- Never silently swallow errors in transforms
- All file modifications must be reversible (create backups)
