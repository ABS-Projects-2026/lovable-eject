import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyseDependencies } from "../../src/analysers/dependencies.js";

describe("analyseDependencies", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should detect @lovable.dev/cloud-auth-js in dependencies", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: {
          "@lovable.dev/cloud-auth-js": "^1.0.0",
          react: "^18.0.0",
        },
      })
    );

    const result = await analyseDependencies(tempDir);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "@lovable.dev/cloud-auth-js",
      version: "^1.0.0",
      type: "dependency",
    });
  });

  it("should detect lovable-tagger in devDependencies", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        devDependencies: {
          "lovable-tagger": "^2.0.0",
          vitest: "^2.0.0",
        },
      })
    );

    const result = await analyseDependencies(tempDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("lovable-tagger");
    expect(result[0].type).toBe("devDependency");
  });

  it("should return empty array when no Lovable deps exist", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: { react: "^18.0.0" },
      })
    );

    const result = await analyseDependencies(tempDir);
    expect(result).toHaveLength(0);
  });

  it("should return empty array when package.json is missing", async () => {
    const result = await analyseDependencies(tempDir);
    expect(result).toHaveLength(0);
  });

  it("should detect multiple Lovable packages", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        dependencies: {
          "@lovable.dev/cloud-auth-js": "^1.0.0",
        },
        devDependencies: {
          "lovable-tagger": "^2.0.0",
        },
      })
    );

    const result = await analyseDependencies(tempDir);
    expect(result).toHaveLength(2);
  });
});
