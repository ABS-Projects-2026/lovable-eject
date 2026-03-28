import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, mkdir, access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { deleteLovableIntegration } from "../../src/transforms/delete-lovable-dir.js";

describe("deleteLovableIntegration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function createLovableDir(files: Record<string, string> = {}) {
    const lovablePath = join(tempDir, "src/integrations/lovable");
    await mkdir(lovablePath, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(lovablePath, name), content);
    }
  }

  it("should delete the lovable integration folder", async () => {
    await createLovableDir({
      "index.ts": "export const lovable = {};",
      "auth.ts": "export function signIn() {}",
    });

    const result = await deleteLovableIntegration(tempDir, false, false);

    expect(result.changed).toBe(true);
    expect(result.description).toContain("Deleted");
    expect(result.files).toEqual(["src/integrations/lovable/"]);

    await expect(
      access(join(tempDir, "src/integrations/lovable"))
    ).rejects.toThrow();
  });

  it("should preserve other integration folders", async () => {
    await createLovableDir({ "index.ts": "export const lovable = {};" });
    const supabasePath = join(tempDir, "src/integrations/supabase");
    await mkdir(supabasePath, { recursive: true });
    await writeFile(join(supabasePath, "client.ts"), "export const supabase = {};");

    await deleteLovableIntegration(tempDir, false, false);

    await expect(access(supabasePath)).resolves.toBeUndefined();
    const clientContent = await readFile(join(supabasePath, "client.ts"), "utf-8");
    expect(clientContent).toBe("export const supabase = {};");
  });

  it("should return changed=false when folder does not exist", async () => {
    const result = await deleteLovableIntegration(tempDir, false, false);

    expect(result.changed).toBe(false);
    expect(result.description).toContain("No src/integrations/lovable/");
  });

  it("should not delete in dry-run mode", async () => {
    await createLovableDir({ "index.ts": "export const lovable = {};" });

    const result = await deleteLovableIntegration(tempDir, true, false);

    expect(result.changed).toBe(true);
    await expect(
      access(join(tempDir, "src/integrations/lovable"))
    ).resolves.toBeUndefined();
  });

  it("should create backup before deleting when backup=true", async () => {
    await createLovableDir({
      "index.ts": "export const lovable = {};",
      "auth.ts": "export function signIn() {}",
    });

    await deleteLovableIntegration(tempDir, false, true);

    // Original should be gone
    await expect(
      access(join(tempDir, "src/integrations/lovable"))
    ).rejects.toThrow();

    // Backup should exist with files
    const backupPath = join(tempDir, "src/integrations/lovable.bak");
    await expect(access(backupPath)).resolves.toBeUndefined();

    const backupIndex = await readFile(join(backupPath, "index.ts"), "utf-8");
    expect(backupIndex).toBe("export const lovable = {};");
  });

  it("should not create backup when backup=false", async () => {
    await createLovableDir({ "index.ts": "export const lovable = {};" });

    await deleteLovableIntegration(tempDir, false, false);

    await expect(
      access(join(tempDir, "src/integrations/lovable.bak"))
    ).rejects.toThrow();
  });
});
