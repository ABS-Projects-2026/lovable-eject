import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, readFile, rm, access, readdir, cp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { restoreProject } from "../../src/commands/restore.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "restore-test-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

describe("restoreProject", () => {
  it("restores .bak files to their originals", async () => {
    // Setup: modified file + its backup
    await writeFile(join(tempDir, "package.json"), '{"modified": true}');
    await writeFile(join(tempDir, "package.json.bak"), '{"original": true}');

    const result = await restoreProject(tempDir, false);

    expect(result.restored).toContain("package.json");
    const content = await readFile(join(tempDir, "package.json"), "utf-8");
    expect(content).toBe('{"original": true}');
    expect(await fileExists(join(tempDir, "package.json.bak"))).toBe(false);
  });

  it("restores .bak when non-bak version does not exist", async () => {
    // Only backup exists (original was deleted by transform)
    await writeFile(join(tempDir, "deleted-file.ts.bak"), "original content");

    const result = await restoreProject(tempDir, false);

    expect(result.restored).toContain("deleted-file.ts");
    const content = await readFile(join(tempDir, "deleted-file.ts"), "utf-8");
    expect(content).toBe("original content");
  });

  it("removes generated files that have no .bak counterpart", async () => {
    // .env.example created by transform (no .bak)
    await writeFile(join(tempDir, ".env.example"), "VITE_SUPABASE_URL=...");
    await writeFile(join(tempDir, "vercel.json"), "{}");
    await mkdir(join(tempDir, "api"), { recursive: true });
    await writeFile(join(tempDir, "api/health.js"), "export default...");

    const result = await restoreProject(tempDir, false);

    expect(result.removed).toContain(".env.example");
    expect(result.removed).toContain("vercel.json");
    expect(result.removed).toContain("api/health.js");
    expect(await fileExists(join(tempDir, ".env.example"))).toBe(false);
    expect(await fileExists(join(tempDir, "vercel.json"))).toBe(false);
    expect(await fileExists(join(tempDir, "api/health.js"))).toBe(false);
  });

  it("does not remove generated files that have a .bak (pre-existing)", async () => {
    // .env.example existed before transform, so it has a .bak
    await writeFile(join(tempDir, ".env.example"), "modified");
    await writeFile(join(tempDir, ".env.example.bak"), "original");

    const result = await restoreProject(tempDir, false);

    // Should restore from .bak, not delete
    expect(result.restored).toContain(".env.example");
    expect(result.removed).not.toContain(".env.example");
    const content = await readFile(join(tempDir, ".env.example"), "utf-8");
    expect(content).toBe("original");
  });

  it("restores backed-up directories", async () => {
    // Simulate: lovable/ was deleted, lovable.bak/ exists
    await mkdir(join(tempDir, "src/integrations/lovable.bak"), { recursive: true });
    await writeFile(
      join(tempDir, "src/integrations/lovable.bak/index.ts"),
      "export const lovable = {};"
    );

    const result = await restoreProject(tempDir, false);

    expect(result.restored).toContain("src/integrations/lovable");
    expect(
      await fileExists(join(tempDir, "src/integrations/lovable/index.ts"))
    ).toBe(true);
    expect(
      await fileExists(join(tempDir, "src/integrations/lovable.bak"))
    ).toBe(false);
  });

  it("restores directory backup even when current directory exists", async () => {
    // Current empty dir + backup with content
    await mkdir(join(tempDir, "src/integrations/lovable"), { recursive: true });
    await mkdir(join(tempDir, "src/integrations/lovable.bak"), { recursive: true });
    await writeFile(
      join(tempDir, "src/integrations/lovable.bak/index.ts"),
      "original"
    );

    const result = await restoreProject(tempDir, false);

    expect(result.restored).toContain("src/integrations/lovable");
    const content = await readFile(
      join(tempDir, "src/integrations/lovable/index.ts"),
      "utf-8"
    );
    expect(content).toBe("original");
  });

  it("dry-run mode shows what would be restored without doing it", async () => {
    await writeFile(join(tempDir, "package.json"), '{"modified": true}');
    await writeFile(join(tempDir, "package.json.bak"), '{"original": true}');
    await writeFile(join(tempDir, ".env.example"), "generated");

    const result = await restoreProject(tempDir, true);

    expect(result.restored).toContain("package.json");
    expect(result.removed).toContain(".env.example");

    // Files should be unchanged
    const pkg = await readFile(join(tempDir, "package.json"), "utf-8");
    expect(pkg).toBe('{"modified": true}');
    expect(await fileExists(join(tempDir, "package.json.bak"))).toBe(true);
    expect(await fileExists(join(tempDir, ".env.example"))).toBe(true);
  });

  it("returns empty results when no .bak files exist", async () => {
    await writeFile(join(tempDir, "package.json"), "{}");

    const result = await restoreProject(tempDir, false);

    expect(result.restored).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("handles multiple .bak files across nested directories", async () => {
    await mkdir(join(tempDir, "src/hooks"), { recursive: true });
    await mkdir(join(tempDir, "supabase/migrations"), { recursive: true });

    await writeFile(join(tempDir, "package.json"), "modified");
    await writeFile(join(tempDir, "package.json.bak"), "original");
    await writeFile(join(tempDir, "src/hooks/useAuth.tsx"), "modified");
    await writeFile(join(tempDir, "src/hooks/useAuth.tsx.bak"), "original");
    await writeFile(join(tempDir, "supabase/migrations/001.sql"), "modified");
    await writeFile(join(tempDir, "supabase/migrations/001.sql.bak"), "original");

    const result = await restoreProject(tempDir, false);

    expect(result.restored).toHaveLength(3);
    expect(result.restored).toContain("package.json");
    expect(result.restored).toContain("src/hooks/useAuth.tsx");
    expect(result.restored).toContain("supabase/migrations/001.sql");
  });

  it("excludes node_modules and .git from scanning", async () => {
    await mkdir(join(tempDir, "node_modules/fake-pkg"), { recursive: true });
    await writeFile(join(tempDir, "node_modules/fake-pkg/index.js.bak"), "x");
    await mkdir(join(tempDir, ".git/objects"), { recursive: true });
    await writeFile(join(tempDir, ".git/objects/abc.bak"), "x");

    const result = await restoreProject(tempDir, false);

    expect(result.restored).toEqual([]);
    // .bak files in excluded dirs should not be touched
    expect(
      await fileExists(join(tempDir, "node_modules/fake-pkg/index.js.bak"))
    ).toBe(true);
  });

  it("cleans up empty api/ directory after removing health.js", async () => {
    await mkdir(join(tempDir, "api"), { recursive: true });
    await writeFile(join(tempDir, "api/health.js"), "export default...");

    const result = await restoreProject(tempDir, false);

    expect(result.removed).toContain("api/health.js");
    expect(await fileExists(join(tempDir, "api"))).toBe(false);
  });

  it("does not remove api/ directory if it has other files", async () => {
    await mkdir(join(tempDir, "api"), { recursive: true });
    await writeFile(join(tempDir, "api/health.js"), "export default...");
    await writeFile(join(tempDir, "api/other.js"), "something else");

    const result = await restoreProject(tempDir, false);

    expect(result.removed).toContain("api/health.js");
    expect(await fileExists(join(tempDir, "api/other.js"))).toBe(true);
  });
});
