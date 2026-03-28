import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, rm, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cleanLovableReferences } from "../../src/transforms/clean-references.js";

describe("cleanLovableReferences", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
    await mkdir(join(tempDir, "src"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should replace *.lovable.app domain references", async () => {
    await writeFile(
      join(tempDir, "src/config.ts"),
      `const API_URL = "https://my-app.lovable.app";\n`
    );

    const result = await cleanLovableReferences(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/config.ts"), "utf-8");
    expect(content).toContain("https://YOUR_DOMAIN.com");
    expect(content).not.toContain("lovable.app");
  });

  it("should replace http lovable.app URLs too", async () => {
    await writeFile(
      join(tempDir, "src/config.ts"),
      `const url = "http://test-project.lovable.app";\n`
    );

    const result = await cleanLovableReferences(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/config.ts"), "utf-8");
    expect(content).toContain("https://YOUR_DOMAIN.com");
  });

  it("should replace lovable.dev opengraph image URLs", async () => {
    await writeFile(
      join(tempDir, "src/meta.tsx"),
      `const ogImage = "https://lovable.dev/opengraph-image-abc123.png";\n`
    );

    const result = await cleanLovableReferences(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/meta.tsx"), "utf-8");
    expect(content).toContain("https://YOUR_DOMAIN.com/og-image.png");
    expect(content).not.toContain("lovable.dev");
  });

  it("should replace lovable.dev/og-image URLs", async () => {
    await writeFile(
      join(tempDir, "src/head.tsx"),
      `const ogImg = "https://lovable.dev/og-image-v2.png";\n`
    );

    const result = await cleanLovableReferences(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/head.tsx"), "utf-8");
    expect(content).toContain("https://YOUR_DOMAIN.com/og-image.png");
  });

  it("should handle HTML files", async () => {
    await writeFile(
      join(tempDir, "index.html"),
      `<meta property="og:image" content="https://lovable.dev/opengraph-image-123.png" />\n`
    );

    const result = await cleanLovableReferences(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "index.html"), "utf-8");
    expect(content).toContain("YOUR_DOMAIN.com/og-image.png");
  });

  it("should handle JSON files", async () => {
    await writeFile(
      join(tempDir, "manifest.json"),
      JSON.stringify({ start_url: "https://my-app.lovable.app" })
    );

    const result = await cleanLovableReferences(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "manifest.json"), "utf-8");
    expect(content).toContain("YOUR_DOMAIN.com");
  });

  it("should handle multiple references in one file", async () => {
    await writeFile(
      join(tempDir, "src/app.tsx"),
      [
        'const domain = "https://my-app.lovable.app";',
        'const og = "https://lovable.dev/opengraph-image-xyz.png";',
        'const redirect = "https://my-app.lovable.app/callback";',
      ].join("\n") + "\n"
    );

    const result = await cleanLovableReferences(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/app.tsx"), "utf-8");
    expect(content).not.toContain("lovable.app");
    expect(content).not.toContain("lovable.dev");
  });

  it("should report all changed files", async () => {
    await writeFile(
      join(tempDir, "src/a.ts"),
      `const x = "https://foo.lovable.app";\n`
    );
    await writeFile(
      join(tempDir, "src/b.ts"),
      `const y = "https://lovable.dev/opengraph-image.png";\n`
    );
    await writeFile(join(tempDir, "src/c.ts"), `const z = "clean";\n`);

    const result = await cleanLovableReferences(tempDir, false, false);

    expect(result.changed).toBe(true);
    expect(result.files).toHaveLength(2);
  });

  it("should return changed=false when no references found", async () => {
    await writeFile(
      join(tempDir, "src/clean.ts"),
      `const url = "https://example.com";\n`
    );

    const result = await cleanLovableReferences(tempDir, false, false);

    expect(result.changed).toBe(false);
    expect(result.files).toEqual([]);
  });

  it("should not modify files in dry-run mode", async () => {
    const original = `const x = "https://foo.lovable.app";\n`;
    await writeFile(join(tempDir, "src/dry.ts"), original);

    const result = await cleanLovableReferences(tempDir, true, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "src/dry.ts"), "utf-8");
    expect(content).toBe(original);
  });

  it("should create backup when backup=true", async () => {
    const original = `const x = "https://foo.lovable.app";\n`;
    await writeFile(join(tempDir, "src/ref.ts"), original);

    await cleanLovableReferences(tempDir, false, true);

    const backup = await readFile(join(tempDir, "src/ref.ts.bak"), "utf-8");
    expect(backup).toBe(original);
  });
});
