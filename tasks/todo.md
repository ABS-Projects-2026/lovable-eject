# lovable-eject — Task Tracker

## Current Phase: Release Prep

### Done
- [x] Project scaffolding (package.json, tsconfig, structure)
- [x] CLAUDE.md setup
- [x] CLI entry point with Commander.js
- [x] `analyse` command — fully functional
- [x] Dependency analyser
- [x] File reference scanner (imports, OAuth, deep links, OG, tagger, domains)
- [x] Migration file analyser (IF NOT EXISTS, CASCADE, jsonb)
- [x] Supabase schema summary
- [x] Capacitor config detector
- [x] Risk assessment scoring
- [x] Grouped output formatting (by type, not flat list)
- [x] Lock file exclusion (package-lock.json, yarn.lock, etc.)
- [x] HTML scan for OG/meta detection
- [x] HTML report generator (--report flag)
- [x] Transform: remove Lovable deps from package.json
- [x] Transform: delete src/integrations/lovable/
- [x] Transform: replace Lovable OAuth → Supabase OAuth
- [x] Transform: fix migration SQL (IF NOT EXISTS, CASCADE, jsonb)
- [x] Transform: remove lovable-tagger from vite config
- [x] Transform: clean Lovable domain & OG references
- [x] Transform: update Capacitor config (app ID + deep links)
- [x] Transform: create .env.example
- [x] Transform: create vercel.json
- [x] Transform: create api/health.js
- [x] Transform command orchestrator with backup + dry-run
- [x] Add transform tests (unit tests for each module — 75 tests)
- [x] Interactive Supabase setup walkthrough (supabase link + db push)
- [x] Vercel deployment guide (env vars display)
- [x] DNS configuration helper (custom domain detection + CNAME instructions)
- [x] Health check verification (api/health.js endpoint check)
- [x] UptimeRobot setup instructions
- [x] Deploy command tests (35 unit tests)
- [x] Web API endpoint (POST /api/deploy)
- [x] Web UI: StepIndicator, DeployView, CopyButton components
- [x] Web UI: responsive layout, view transitions, hover micro-interactions
- [x] Web UI: code diff previews, success animation, personality microcopy
- [x] Web UI: SVG logo, dashboard layout overhaul
- [x] README.md — complete rewrite for public audience
- [x] LICENSE (MIT)
- [x] .npmignore
- [x] CONTRIBUTING.md
- [x] package.json cleanup (author, repo, homepage, bugs, prepublishOnly)
- [x] .gitignore update (*.bak, web/node_modules, web/dist)
- [x] git init
- [x] Verify: 126 tests pass
- [x] Verify: tsc build succeeds
- [x] Verify: node dist/cli.js --help works

### Up Next
- [ ] Test transforms against real Lovable project (habit-buddy)
- [ ] Verify build succeeds after transform on real project
- [ ] npm publish (after testing)
- [ ] GitHub Actions CI (test + build on push)
- [ ] Add screenshots to README
