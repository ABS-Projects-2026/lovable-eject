import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyseMigrations } from "../../src/analysers/migrations.js";

describe("analyseMigrations", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
    await mkdir(join(tempDir, "supabase", "migrations"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should detect CREATE TABLE without IF NOT EXISTS", async () => {
    await writeFile(
      join(tempDir, "supabase/migrations/001_create_users.sql"),
      `CREATE TABLE public.users (\n  id uuid PRIMARY KEY\n);`
    );

    const result = await analyseMigrations(tempDir);

    expect(result.fileCount).toBe(1);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("missing-if-not-exists");
  });

  it("should NOT flag CREATE TABLE IF NOT EXISTS", async () => {
    await writeFile(
      join(tempDir, "supabase/migrations/001_create_users.sql"),
      `CREATE TABLE IF NOT EXISTS public.users (\n  id uuid PRIMARY KEY\n);`
    );

    const result = await analyseMigrations(tempDir);

    expect(result.issues.filter((i) => i.type === "missing-if-not-exists")).toHaveLength(0);
  });

  it("should detect DROP FUNCTION without CASCADE", async () => {
    await writeFile(
      join(tempDir, "supabase/migrations/002_functions.sql"),
      `DROP FUNCTION IF EXISTS public.get_user_role;`
    );

    const result = await analyseMigrations(tempDir);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("missing-cascade");
  });

  it("should NOT flag DROP FUNCTION with CASCADE", async () => {
    await writeFile(
      join(tempDir, "supabase/migrations/002_functions.sql"),
      `DROP FUNCTION IF EXISTS public.get_user_role CASCADE;`
    );

    const result = await analyseMigrations(tempDir);

    expect(result.issues.filter((i) => i.type === "missing-cascade")).toHaveLength(0);
  });

  it("should detect unsafe jsonb_set without COALESCE", async () => {
    await writeFile(
      join(tempDir, "supabase/migrations/003_update.sql"),
      `UPDATE profiles SET metadata = jsonb_set(metadata, '{theme}', '"dark"');`
    );

    const result = await analyseMigrations(tempDir);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].type).toBe("unsafe-jsonb-set");
  });

  it("should return zero issues for clean migrations", async () => {
    await writeFile(
      join(tempDir, "supabase/migrations/001_clean.sql"),
      `CREATE TABLE IF NOT EXISTS public.users (\n  id uuid PRIMARY KEY\n);\nDROP FUNCTION IF EXISTS public.old_func CASCADE;`
    );

    const result = await analyseMigrations(tempDir);
    expect(result.issues).toHaveLength(0);
  });

  it("should return zero file count when no migrations exist", async () => {
    await rm(join(tempDir, "supabase"), { recursive: true, force: true });

    const result = await analyseMigrations(tempDir);

    expect(result.fileCount).toBe(0);
    expect(result.issues).toHaveLength(0);
  });
});
