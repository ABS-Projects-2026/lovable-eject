import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { replaceOAuthCalls } from "../../src/transforms/replace-oauth.js";

describe("replaceOAuthCalls", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
    await mkdir(join(tempDir, "src"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function writeSrcFile(name: string, content: string) {
    const filePath = join(tempDir, "src", name);
    await writeFile(filePath, content);
    return filePath;
  }

  it("should replace Lovable integration import with Supabase import", async () => {
    await writeSrcFile(
      "auth.ts",
      `import { lovable } from '@/integrations/lovable';\n\nconsole.log(lovable);\n`
    );

    const result = await replaceOAuthCalls(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/auth.ts"), "utf-8");
    expect(content).toContain(
      "import { supabase } from '@/integrations/supabase/client'"
    );
    expect(content).not.toContain("@/integrations/lovable");
  });

  it("should replace @lovable.dev/cloud-auth-js import", async () => {
    await writeSrcFile(
      "login.tsx",
      `import { auth } from '@lovable.dev/cloud-auth-js';\n`
    );

    const result = await replaceOAuthCalls(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/login.tsx"), "utf-8");
    expect(content).toContain("@/integrations/supabase/client");
    expect(content).not.toContain("@lovable.dev/cloud-auth-js");
  });

  it("should replace lovable.auth.signInWithOAuth with redirect_uri", async () => {
    await writeSrcFile(
      "oauth.ts",
      `lovable.auth.signInWithOAuth(google, { redirect_uri: callbackUrl })\n`
    );

    const result = await replaceOAuthCalls(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/oauth.ts"), "utf-8");
    expect(content).toContain("supabase.auth.signInWithOAuth");
    expect(content).toContain("provider: google");
    expect(content).toContain("redirectTo:");
    expect(content).not.toContain("lovable.auth");
  });

  it("should replace simple lovable.auth.signInWithOAuth call", async () => {
    await writeSrcFile(
      "simple-oauth.ts",
      `lovable.auth.signInWithOAuth(github)\n`
    );

    const result = await replaceOAuthCalls(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/simple-oauth.ts"), "utf-8");
    expect(content).toContain("supabase.auth.signInWithOAuth({ provider: github })");
  });

  it("should replace remaining lovable.auth.X calls", async () => {
    await writeSrcFile(
      "session.ts",
      `const session = await lovable.auth.getSession();\nlovable.auth.signOut();\n`
    );

    const result = await replaceOAuthCalls(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/session.ts"), "utf-8");
    expect(content).toContain("supabase.auth.getSession()");
    expect(content).toContain("supabase.auth.signOut()");
    expect(content).not.toContain("lovable.auth");
  });

  it("should deduplicate supabase imports when one already exists", async () => {
    await writeSrcFile(
      "dupe.ts",
      [
        "import { supabase } from '@/integrations/supabase/client';",
        "import { lovable } from '@/integrations/lovable';",
        "",
        "lovable.auth.getSession();",
        "",
      ].join("\n")
    );

    const result = await replaceOAuthCalls(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/dupe.ts"), "utf-8");
    const importMatches = content.match(
      /import\s*\{\s*supabase\s*\}\s*from\s*'@\/integrations\/supabase\/client'/g
    );
    expect(importMatches).toHaveLength(1);
  });

  it("should return changed=false when no OAuth calls exist", async () => {
    await writeSrcFile(
      "clean.ts",
      `import { supabase } from '@/integrations/supabase/client';\n`
    );

    const result = await replaceOAuthCalls(tempDir, false, false);

    expect(result.changed).toBe(false);
    expect(result.files).toEqual([]);
  });

  it("should not modify files in dry-run mode", async () => {
    const original = `import { lovable } from '@/integrations/lovable';\n`;
    await writeSrcFile("dry.ts", original);

    const result = await replaceOAuthCalls(tempDir, true, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/dry.ts"), "utf-8");
    expect(content).toBe(original);
  });

  it("should handle multiple files with different patterns", async () => {
    await writeSrcFile(
      "file1.tsx",
      `import { lovable } from '@/integrations/lovable';\nlovable.auth.signOut();\n`
    );
    await writeSrcFile(
      "file2.ts",
      `import { auth } from '@lovable.dev/cloud-auth-js';\n`
    );
    await writeSrcFile("file3.ts", `const x = 1;\n`);

    const result = await replaceOAuthCalls(tempDir, false, false);

    expect(result.changed).toBe(true);
    expect(result.files).toHaveLength(2);
  });

  it("should create backups when backup=true", async () => {
    const original = `import { lovable } from '@/integrations/lovable';\n`;
    await writeSrcFile("backup.ts", original);

    await replaceOAuthCalls(tempDir, false, true);

    const backup = await readFile(join(tempDir, "src/backup.ts.bak"), "utf-8");
    expect(backup).toBe(original);
  });
});
