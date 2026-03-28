import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { updateCapacitorConfig } from "../../src/transforms/update-capacitor.js";

describe("updateCapacitorConfig", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should replace app.lovable.<UUID> in capacitor.config.ts", async () => {
    const config = `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  appName: 'My App',
  webDir: 'dist',
};

export default config;
`;
    await writeFile(join(tempDir, "capacitor.config.ts"), config);

    const result = await updateCapacitorConfig(tempDir, false, false);

    expect(result.changed).toBe(true);
    expect(result.description).toContain("Updated Capacitor app ID");

    const content = await readFile(join(tempDir, "capacitor.config.ts"), "utf-8");
    expect(content).toContain("com.yourapp.name");
    expect(content).not.toContain("app.lovable.");
    expect(content).toContain("appName: 'My App'");
  });

  it("should replace app.lovable.<UUID> in capacitor.config.json", async () => {
    const config = JSON.stringify(
      {
        appId: "app.lovable.deadbeef-1234-5678-9abc-def012345678",
        appName: "My App",
        webDir: "dist",
      },
      null,
      2
    );
    await writeFile(join(tempDir, "capacitor.config.json"), config);

    const result = await updateCapacitorConfig(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(
      join(tempDir, "capacitor.config.json"),
      "utf-8"
    );
    expect(content).toContain("com.yourapp.name");
    expect(content).not.toContain("app.lovable.");
  });

  it("should prefer .ts config over .json when both exist", async () => {
    await writeFile(
      join(tempDir, "capacitor.config.ts"),
      `const config = { appId: 'app.lovable.aaaa-bbbb' };\nexport default config;\n`
    );
    await writeFile(
      join(tempDir, "capacitor.config.json"),
      JSON.stringify({ appId: "app.lovable.cccc-dddd" })
    );

    const result = await updateCapacitorConfig(tempDir, false, false);

    expect(result.changed).toBe(true);
    // Should have modified the .ts file
    expect(result.files[0]).toContain("capacitor.config.ts");
  });

  it("should return changed=false when no Capacitor config exists", async () => {
    const result = await updateCapacitorConfig(tempDir, false, false);

    expect(result.changed).toBe(false);
    expect(result.description).toContain("No Capacitor config");
  });

  it("should return changed=false when config has no Lovable references", async () => {
    const config = `const config = { appId: 'com.myapp.production' };\nexport default config;\n`;
    await writeFile(join(tempDir, "capacitor.config.ts"), config);

    const result = await updateCapacitorConfig(tempDir, false, false);

    expect(result.changed).toBe(false);
    expect(result.description).toContain("no Lovable references");
  });

  it("should replace multiple Lovable app ID references", async () => {
    const config = [
      "const config = {",
      "  appId: 'app.lovable.1111-2222',",
      "  deepLinks: ['app.lovable.1111-2222://callback'],",
      "};",
    ].join("\n");
    await writeFile(join(tempDir, "capacitor.config.ts"), config);

    const result = await updateCapacitorConfig(tempDir, false, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "capacitor.config.ts"), "utf-8");
    expect(content).not.toContain("app.lovable.");
    // Both references replaced
    const matches = content.match(/com\.yourapp\.name/g);
    expect(matches).toHaveLength(2);
  });

  it("should not modify file in dry-run mode", async () => {
    const original = `const config = { appId: 'app.lovable.aaaa-bbbb' };\n`;
    await writeFile(join(tempDir, "capacitor.config.ts"), original);

    const result = await updateCapacitorConfig(tempDir, true, false);

    expect(result.changed).toBe(true);
    const content = await readFile(join(tempDir, "capacitor.config.ts"), "utf-8");
    expect(content).toBe(original);
  });

  it("should create backup when backup=true", async () => {
    const original = `const config = { appId: 'app.lovable.aaaa-bbbb' };\n`;
    await writeFile(join(tempDir, "capacitor.config.ts"), original);

    await updateCapacitorConfig(tempDir, false, true);

    const backup = await readFile(
      join(tempDir, "capacitor.config.ts.bak"),
      "utf-8"
    );
    expect(backup).toBe(original);
  });
});
