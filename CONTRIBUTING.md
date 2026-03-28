# Contributing to lovable-eject

## Setup

```bash
git clone https://github.com/ABS-Projects-2026/lovable-eject.git
cd lovable-eject
npm install
cd web && npm install && cd ..
```

## Running Tests

```bash
npm test          # Watch mode
npm run test:run  # Single run
```

All tests use temporary directories with realistic Lovable project fixtures. No external services required.

## Manual Testing

Use a real Lovable project for integration testing. The test fixture lives at `~/Desktop/lovable-fresh-app`. Reset it before each test run:

```bash
cd ~/Desktop/lovable-fresh-app && git checkout .
```

Then run commands against it:

```bash
npm run dev -- analyse ~/Desktop/lovable-fresh-app
npm run dev -- transform ~/Desktop/lovable-fresh-app --dry-run
```

## Architecture

```
src/
  cli.ts              — Commander.js entry point
  commands/
    analyse.ts        — Runs all analysers, formats output
    transform.ts      — Orchestrates transforms sequentially
    deploy.ts         — Interactive Inquirer.js walkthrough
  analysers/
    dependencies.ts   — Scans package.json for Lovable deps
    references.ts     — Finds Lovable imports, OAuth, deep links, OG images
    migrations.ts     — Checks SQL for IF NOT EXISTS, CASCADE, jsonb issues
    supabase-schema.ts — Summarises tables, views, functions, enums
    capacitor.ts      — Detects Capacitor config
    risk.ts           — Scores migration complexity
  transforms/
    remove-deps.ts    — Strips Lovable packages from package.json
    replace-oauth.ts  — Rewrites Lovable OAuth → Supabase auth
    delete-lovable-dir.ts — Removes src/integrations/lovable/
    remove-tagger.ts  — Strips lovable-tagger from vite config
    fix-migrations.ts — Patches SQL migration files
    clean-references.ts — Replaces domain + OG image URLs
    update-capacitor.ts — Updates Capacitor app ID
    generate-configs.ts — Creates .env.example, vercel.json, api/health.js
  utils/
    files.ts          — File I/O, glob, grep helpers
    logger.ts         — Chalk + Ora output utilities
    report.ts         — HTML report generator

web/
  server.ts           — Express API with SSE streaming for transforms
  src/                — React + Tailwind UI
tests/                — Mirrors src/ structure
```

## Submitting Changes

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-change`
3. Write tests for your changes
4. Ensure `npm run test:run` passes
5. Ensure `npm run build` succeeds
6. Submit a PR with a clear description

## Code Style

- TypeScript strict mode
- Immutable patterns (spread, not mutation)
- Small functions, small files
- Descriptive error messages (users aren't DevOps experts)
- No `console.log` in production code — use `log.*` from `src/utils/logger.ts`
