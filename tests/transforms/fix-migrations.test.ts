import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, rm, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fixMigrations } from "../../src/transforms/fix-migrations.js";

describe("fixMigrations", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
    await mkdir(join(tempDir, "supabase/migrations"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function writeMigration(name: string, sql: string) {
    const filePath = join(tempDir, "supabase/migrations", name);
    await writeFile(filePath, sql);
    return filePath;
  }

  it("should add IF NOT EXISTS to CREATE TABLE", async () => {
    await writeMigration(
      "001_tables.sql",
      "CREATE TABLE users (\n  id uuid PRIMARY KEY\n);\n"
    );

    const result = await fixMigrations(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(
      join(tempDir, "supabase/migrations/001_tables.sql"),
      "utf-8"
    );
    expect(content).toContain("CREATE TABLE IF NOT EXISTS");
  });

  it("should not double-add IF NOT EXISTS", async () => {
    await writeMigration(
      "001_tables.sql",
      "CREATE TABLE IF NOT EXISTS users (\n  id uuid PRIMARY KEY\n);\n"
    );

    const result = await fixMigrations(tempDir, false, false);

    expect(result.changed).toBe(false);
  });

  it("should add CASCADE to DROP FUNCTION IF EXISTS", async () => {
    await writeMigration(
      "002_functions.sql",
      "DROP FUNCTION IF EXISTS my_func;\n"
    );

    const result = await fixMigrations(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(
      join(tempDir, "supabase/migrations/002_functions.sql"),
      "utf-8"
    );
    expect(content).toContain("DROP FUNCTION IF EXISTS my_func CASCADE;");
  });

  it("should not double-add CASCADE", async () => {
    await writeMigration(
      "002_functions.sql",
      "DROP FUNCTION IF EXISTS my_func CASCADE;\n"
    );

    const result = await fixMigrations(tempDir, false, false);

    expect(result.changed).toBe(false);
  });

  it("should wrap jsonb_set with COALESCE", async () => {
    await writeMigration(
      "003_jsonb.sql",
      "UPDATE profiles SET metadata = jsonb_set(metadata, '{key}', '\"val\"');\n"
    );

    const result = await fixMigrations(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(
      join(tempDir, "supabase/migrations/003_jsonb.sql"),
      "utf-8"
    );
    expect(content).toContain("COALESCE(metadata, '{}'::jsonb)");
  });

  it("should not double-wrap COALESCE on jsonb_set", async () => {
    await writeMigration(
      "003_jsonb.sql",
      "UPDATE profiles SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{key}', '\"val\"');\n"
    );

    const result = await fixMigrations(tempDir, false, false);

    // The regex checks for COALESCE in the match itself, so this should be unchanged
    expect(result.changed).toBe(false);
  });

  it("should handle qualified column names in jsonb_set", async () => {
    await writeMigration(
      "004_qualified.sql",
      "UPDATE t SET c = jsonb_set(t.metadata, '{k}', '\"v\"');\n"
    );

    const result = await fixMigrations(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(
      join(tempDir, "supabase/migrations/004_qualified.sql"),
      "utf-8"
    );
    expect(content).toContain("COALESCE(t.metadata, '{}'::jsonb)");
  });

  it("should fix multiple issues in one file", async () => {
    const sql = [
      "CREATE TABLE users (id uuid PRIMARY KEY);",
      "CREATE TABLE posts (id uuid PRIMARY KEY);",
      "DROP FUNCTION IF EXISTS old_func;",
      "UPDATE t SET c = jsonb_set(metadata, '{k}', '\"v\"');",
    ].join("\n");
    await writeMigration("005_multi.sql", sql);

    const result = await fixMigrations(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(
      join(tempDir, "supabase/migrations/005_multi.sql"),
      "utf-8"
    );
    expect(content).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(content).toContain("CREATE TABLE IF NOT EXISTS posts");
    expect(content).toContain("CASCADE;");
    expect(content).toContain("COALESCE(metadata");
  });

  it("should fix issues across multiple files", async () => {
    await writeMigration(
      "001.sql",
      "CREATE TABLE a (id uuid PRIMARY KEY);\n"
    );
    await writeMigration(
      "002.sql",
      "DROP FUNCTION IF EXISTS fn;\n"
    );

    const result = await fixMigrations(tempDir, false, false);

    expect(result.changed).toBe(true);
    expect(result.files).toHaveLength(2);
    expect(result.description).toContain("2 migration file(s)");
  });

  it("should return changed=false when no migrations exist", async () => {
    await rm(join(tempDir, "supabase"), { recursive: true, force: true });

    const result = await fixMigrations(tempDir, false, false);

    expect(result.changed).toBe(false);
  });

  it("should not modify files in dry-run mode", async () => {
    const original = "CREATE TABLE users (id uuid PRIMARY KEY);\n";
    await writeMigration("001.sql", original);

    const result = await fixMigrations(tempDir, true, false);

    expect(result.changed).toBe(true);
    const content = await readFile(
      join(tempDir, "supabase/migrations/001.sql"),
      "utf-8"
    );
    expect(content).toBe(original);
  });

  it("should create backup when backup=true", async () => {
    const original = "CREATE TABLE users (id uuid PRIMARY KEY);\n";
    await writeMigration("001.sql", original);

    await fixMigrations(tempDir, false, true);

    const backup = await readFile(
      join(tempDir, "supabase/migrations/001.sql.bak"),
      "utf-8"
    );
    expect(backup).toBe(original);
  });
});
