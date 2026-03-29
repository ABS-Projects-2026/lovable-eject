import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, cp, readFile, access, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyseDependencies } from "../../src/analysers/dependencies.js";
import { analyseLovableReferences } from "../../src/analysers/references.js";
import { analyseMigrations } from "../../src/analysers/migrations.js";
import { analyseCapacitor } from "../../src/analysers/capacitor.js";
import { assessRisk } from "../../src/analysers/risk.js";
import { analyseSupabaseSchema } from "../../src/analysers/supabase-schema.js";
import { removeLovableDeps } from "../../src/transforms/remove-deps.js";
import { replaceOAuthCalls } from "../../src/transforms/replace-oauth.js";
import { deleteLovableIntegration } from "../../src/transforms/delete-lovable-dir.js";
import { removeTagger } from "../../src/transforms/remove-tagger.js";
import { fixMigrations } from "../../src/transforms/fix-migrations.js";
import { cleanLovableReferences } from "../../src/transforms/clean-references.js";
import { updateCapacitorConfig } from "../../src/transforms/update-capacitor.js";
import { createEnvExample, createVercelConfig, createHealthEndpoint } from "../../src/transforms/generate-configs.js";
import { restoreProject } from "../../src/commands/restore.js";

const FIXTURE_PATH = join(import.meta.dirname, "../fixtures/mock-lovable-project");

let tempDir: string;

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function runAllAnalysis(projectPath: string) {
  const [lovableDeps, lovableFiles, migrations, supabaseSchema, capacitor] =
    await Promise.all([
      analyseDependencies(projectPath),
      analyseLovableReferences(projectPath),
      analyseMigrations(projectPath),
      analyseSupabaseSchema(projectPath),
      analyseCapacitor(projectPath),
    ]);
  const risk = assessRisk({ lovableDeps, lovableFiles, migrations, supabaseSchema, capacitor });
  return { lovableDeps, lovableFiles, migrations, supabaseSchema, capacitor, risk };
}

async function runAllTransforms(projectPath: string, dryRun: boolean) {
  // Must run sequentially — same order as the CLI transform command
  const results = [
    await removeLovableDeps(projectPath, dryRun, true),
    await replaceOAuthCalls(projectPath, dryRun, true),
    await deleteLovableIntegration(projectPath, dryRun, true),
    await removeTagger(projectPath, dryRun, true),
    await fixMigrations(projectPath, dryRun, true),
    await cleanLovableReferences(projectPath, dryRun, true),
    await updateCapacitorConfig(projectPath, dryRun, true),
    await createEnvExample(projectPath, dryRun),
    await createVercelConfig(projectPath, dryRun),
    await createHealthEndpoint(projectPath, dryRun),
  ];
  return results;
}

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "lovable-integration-"));
  await cp(FIXTURE_PATH, tempDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Full migration integration", () => {
  it("analyse detects all issues", async () => {
    const result = await runAllAnalysis(tempDir);

    // Should find 2 Lovable deps
    expect(result.lovableDeps.length).toBe(2);
    const depNames = result.lovableDeps.map((d) => d.name);
    expect(depNames).toContain("@lovable.dev/cloud-auth-js");
    expect(depNames).toContain("lovable-tagger");

    // Should find OAuth calls
    const oauthRefs = result.lovableFiles.filter((f) => f.referenceType === "oauth-call");
    expect(oauthRefs.length).toBeGreaterThan(0);

    // Should find deep link / domain references
    const domainRefs = result.lovableFiles.filter(
      (f) => f.referenceType === "domain" || f.referenceType === "deep-link"
    );
    expect(domainRefs.length).toBeGreaterThan(0);

    // Should find tagger references
    const taggerRefs = result.lovableFiles.filter((f) => f.referenceType === "tagger");
    expect(taggerRefs.length).toBeGreaterThan(0);

    // Should find migration issues
    expect(result.migrations.issues.length).toBeGreaterThan(0);
    const issueTypes = result.migrations.issues.map((i) => i.type);
    expect(issueTypes).toContain("missing-if-not-exists");
    expect(issueTypes).toContain("missing-cascade");

    // Should detect Capacitor
    expect(result.capacitor).not.toBeNull();
    expect(result.capacitor!.appId).toContain("lovable");

    // Risk should not be simple (has real issues)
    expect(result.risk.level).not.toBe("simple");
  });

  it("transform fixes all issues", async () => {
    await runAllTransforms(tempDir, false);

    // package.json should not have Lovable deps
    const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
    expect(pkg.dependencies["@lovable.dev/cloud-auth-js"]).toBeUndefined();
    expect(pkg.devDependencies["lovable-tagger"]).toBeUndefined();

    // useAuth should import from supabase, not lovable
    const authContent = await readFile(join(tempDir, "src/hooks/useAuth.tsx"), "utf-8");
    expect(authContent).not.toContain("lovable");
    expect(authContent).toContain("supabase");

    // vite.config.ts should not have tagger
    const viteContent = await readFile(join(tempDir, "vite.config.ts"), "utf-8");
    expect(viteContent).not.toContain("componentTagger");
    expect(viteContent).not.toContain("lovable-tagger");

    // lovable integration folder should be gone
    expect(await fileExists(join(tempDir, "src/integrations/lovable"))).toBe(false);

    // Migrations should have IF NOT EXISTS
    const sql = await readFile(join(tempDir, "supabase/migrations/001_create.sql"), "utf-8");
    expect(sql).toContain("IF NOT EXISTS");
    expect(sql).toContain("CASCADE");

    // Generated files should exist
    expect(await fileExists(join(tempDir, ".env.example"))).toBe(true);
    expect(await fileExists(join(tempDir, "vercel.json"))).toBe(true);
    expect(await fileExists(join(tempDir, "api/health.js"))).toBe(true);
  });

  it("analyse after transform shows clean", async () => {
    await runAllTransforms(tempDir, false);
    const result = await runAllAnalysis(tempDir);

    expect(result.lovableDeps.length).toBe(0);

    // No more OAuth calls to Lovable
    const oauthRefs = result.lovableFiles.filter((f) => f.referenceType === "oauth-call");
    expect(oauthRefs.length).toBe(0);

    // No tagger references
    const taggerRefs = result.lovableFiles.filter((f) => f.referenceType === "tagger");
    expect(taggerRefs.length).toBe(0);

    // Migration issues should be fixed
    const missingIfNotExists = result.migrations.issues.filter(
      (i) => i.type === "missing-if-not-exists"
    );
    expect(missingIfNotExists.length).toBe(0);

    const missingCascade = result.migrations.issues.filter(
      (i) => i.type === "missing-cascade"
    );
    expect(missingCascade.length).toBe(0);
  });

  it("restore reverts all changes", async () => {
    // Run analysis before transform
    const beforeAnalysis = await runAllAnalysis(tempDir);

    // Transform
    await runAllTransforms(tempDir, false);

    // Restore
    const restoreResult = await restoreProject(tempDir, false);
    expect(restoreResult.restored.length).toBeGreaterThan(0);
    expect(restoreResult.removed.length).toBeGreaterThan(0);

    // Analyse again — should match original
    const afterRestoreAnalysis = await runAllAnalysis(tempDir);

    expect(afterRestoreAnalysis.lovableDeps.length).toBe(beforeAnalysis.lovableDeps.length);
    expect(afterRestoreAnalysis.migrations.issues.length).toBe(beforeAnalysis.migrations.issues.length);

    // Lovable integration folder should be back
    expect(await fileExists(join(tempDir, "src/integrations/lovable/index.ts"))).toBe(true);

    // Generated files should be gone
    expect(await fileExists(join(tempDir, ".env.example"))).toBe(false);
    expect(await fileExists(join(tempDir, "vercel.json"))).toBe(false);
    expect(await fileExists(join(tempDir, "api/health.js"))).toBe(false);
  });

  it("dry-run makes no changes", async () => {
    // Capture original file contents
    const originalPkg = await readFile(join(tempDir, "package.json"), "utf-8");
    const originalAuth = await readFile(join(tempDir, "src/hooks/useAuth.tsx"), "utf-8");
    const originalVite = await readFile(join(tempDir, "vite.config.ts"), "utf-8");
    const originalSql = await readFile(join(tempDir, "supabase/migrations/001_create.sql"), "utf-8");

    // Run transforms in dry-run mode
    await runAllTransforms(tempDir, true);

    // All files should be unchanged
    expect(await readFile(join(tempDir, "package.json"), "utf-8")).toBe(originalPkg);
    expect(await readFile(join(tempDir, "src/hooks/useAuth.tsx"), "utf-8")).toBe(originalAuth);
    expect(await readFile(join(tempDir, "vite.config.ts"), "utf-8")).toBe(originalVite);
    expect(await readFile(join(tempDir, "supabase/migrations/001_create.sql"), "utf-8")).toBe(originalSql);

    // Lovable integration folder should still exist
    expect(await fileExists(join(tempDir, "src/integrations/lovable/index.ts"))).toBe(true);

    // Generated files should NOT have been created
    expect(await fileExists(join(tempDir, ".env.example"))).toBe(false);
    expect(await fileExists(join(tempDir, "vercel.json"))).toBe(false);
    expect(await fileExists(join(tempDir, "api/health.js"))).toBe(false);
  });
});
