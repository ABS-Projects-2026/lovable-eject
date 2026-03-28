import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { removeLovableDeps } from "../../src/transforms/remove-deps.js";

describe("removeLovableDeps", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should remove @lovable.dev/cloud-auth-js from dependencies", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: {
          "@lovable.dev/cloud-auth-js": "^1.0.0",
          react: "^18.0.0",
        },
      })
    );

    const result = await removeLovableDeps(tempDir, false, false);

    expect(result.changed).toBe(true);
    expect(result.description).toContain("@lovable.dev/cloud-auth-js");
    expect(result.files).toEqual(["package.json"]);

    const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
    expect(pkg.dependencies).not.toHaveProperty("@lovable.dev/cloud-auth-js");
    expect(pkg.dependencies).toHaveProperty("react");
  });

  it("should remove lovable-tagger from devDependencies", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        devDependencies: {
          "lovable-tagger": "^2.0.0",
          vitest: "^2.0.0",
        },
      })
    );

    const result = await removeLovableDeps(tempDir, false, false);

    expect(result.changed).toBe(true);
    expect(result.description).toContain("lovable-tagger");

    const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
    expect(pkg.devDependencies).not.toHaveProperty("lovable-tagger");
    expect(pkg.devDependencies).toHaveProperty("vitest");
  });

  it("should remove @lovable.dev/sdk from dependencies", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: {
          "@lovable.dev/sdk": "^0.5.0",
          react: "^18.0.0",
        },
      })
    );

    const result = await removeLovableDeps(tempDir, false, false);

    expect(result.changed).toBe(true);
    expect(result.description).toContain("@lovable.dev/sdk");
  });

  it("should remove multiple Lovable deps at once", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: {
          "@lovable.dev/cloud-auth-js": "^1.0.0",
          "@lovable.dev/sdk": "^0.5.0",
          react: "^18.0.0",
        },
        devDependencies: {
          "lovable-tagger": "^2.0.0",
        },
      })
    );

    const result = await removeLovableDeps(tempDir, false, false);

    expect(result.changed).toBe(true);
    expect(result.description).toContain("@lovable.dev/cloud-auth-js");
    expect(result.description).toContain("@lovable.dev/sdk");
    expect(result.description).toContain("lovable-tagger");

    const pkg = JSON.parse(await readFile(join(tempDir, "package.json"), "utf-8"));
    expect(Object.keys(pkg.dependencies)).toEqual(["react"]);
    expect(Object.keys(pkg.devDependencies)).toEqual([]);
  });

  it("should return changed=false when no Lovable deps exist", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: { react: "^18.0.0" },
      })
    );

    const result = await removeLovableDeps(tempDir, false, false);

    expect(result.changed).toBe(false);
    expect(result.files).toEqual([]);
  });

  it("should return changed=false when package.json is missing", async () => {
    const result = await removeLovableDeps(tempDir, false, false);

    expect(result.changed).toBe(false);
    expect(result.description).toContain("No package.json");
  });

  it("should not modify file in dry-run mode", async () => {
    const originalContent = JSON.stringify({
      dependencies: {
        "@lovable.dev/cloud-auth-js": "^1.0.0",
        react: "^18.0.0",
      },
    });
    await writeFile(join(tempDir, "package.json"), originalContent);

    const result = await removeLovableDeps(tempDir, true, false);

    expect(result.changed).toBe(true);
    expect(result.description).toContain("@lovable.dev/cloud-auth-js");

    const afterContent = await readFile(join(tempDir, "package.json"), "utf-8");
    expect(JSON.parse(afterContent).dependencies).toHaveProperty(
      "@lovable.dev/cloud-auth-js"
    );
  });

  it("should create backup when backup=true", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: { "@lovable.dev/cloud-auth-js": "^1.0.0" },
      })
    );

    await removeLovableDeps(tempDir, false, true);

    await expect(
      access(join(tempDir, "package.json.bak"))
    ).resolves.toBeUndefined();

    const backup = JSON.parse(
      await readFile(join(tempDir, "package.json.bak"), "utf-8")
    );
    expect(backup.dependencies).toHaveProperty("@lovable.dev/cloud-auth-js");
  });

  it("should not create backup when backup=false", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: { "@lovable.dev/cloud-auth-js": "^1.0.0" },
      })
    );

    await removeLovableDeps(tempDir, false, false);

    await expect(
      access(join(tempDir, "package.json.bak"))
    ).rejects.toThrow();
  });
});
