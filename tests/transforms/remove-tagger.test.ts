import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { removeTagger } from "../../src/transforms/remove-tagger.js";

describe("removeTagger", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should remove lovable-tagger import and componentTagger() from plugins", async () => {
    const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";

export default defineConfig({
  plugins: [
    react(),
    componentTagger(),
  ],
});
`;
    await writeFile(join(tempDir, "vite.config.ts"), viteConfig);

    const result = await removeTagger(tempDir, false, false);

    expect(result.changed).toBe(true);
    expect(result.files).toEqual(["vite.config.ts"]);

    const content = await readFile(join(tempDir, "vite.config.ts"), "utf-8");
    expect(content).not.toContain("lovable-tagger");
    expect(content).not.toContain("componentTagger");
    expect(content).toContain("react()");
  });

  it("should remove mode === 'development' && componentTagger() pattern", async () => {
    const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ],
}));
`;
    await writeFile(join(tempDir, "vite.config.ts"), viteConfig);

    const result = await removeTagger(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "vite.config.ts"), "utf-8");
    expect(content).not.toContain("lovable-tagger");
    expect(content).not.toContain("componentTagger");
    expect(content).not.toContain("mode === 'development'");
  });

  it("should return changed=false when no vite.config.ts exists", async () => {
    const result = await removeTagger(tempDir, false, false);

    expect(result.changed).toBe(false);
    expect(result.description).toContain("No vite.config.ts");
  });

  it("should return changed=false when no tagger references exist", async () => {
    const viteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
});
`;
    await writeFile(join(tempDir, "vite.config.ts"), viteConfig);

    const result = await removeTagger(tempDir, false, false);

    expect(result.changed).toBe(false);
    expect(result.description).toContain("No lovable-tagger reference");
  });

  it("should not modify file in dry-run mode", async () => {
    const original = `import { componentTagger } from "lovable-tagger";
export default defineConfig({ plugins: [componentTagger()] });
`;
    await writeFile(join(tempDir, "vite.config.ts"), original);

    const result = await removeTagger(tempDir, true, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "vite.config.ts"), "utf-8");
    expect(content).toBe(original);
  });

  it("should create backup when backup=true", async () => {
    const original = `import { componentTagger } from "lovable-tagger";
export default defineConfig({ plugins: [componentTagger()] });
`;
    await writeFile(join(tempDir, "vite.config.ts"), original);

    await removeTagger(tempDir, false, true);

    const backup = await readFile(join(tempDir, "vite.config.ts.bak"), "utf-8");
    expect(backup).toBe(original);
  });

  it("should clean up trailing commas and empty arrays after removal", async () => {
    const viteConfig = `import { defineConfig } from "vite";
import { componentTagger } from "lovable-tagger";

export default defineConfig({
  plugins: [
    componentTagger(),
  ],
});
`;
    await writeFile(join(tempDir, "vite.config.ts"), viteConfig);

    const result = await removeTagger(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "vite.config.ts"), "utf-8");
    expect(content).not.toContain("componentTagger");
    // Should not have double commas or leading commas in arrays
    expect(content).not.toMatch(/,\s*,/);
    expect(content).not.toMatch(/\[\s*,/);
  });
});
