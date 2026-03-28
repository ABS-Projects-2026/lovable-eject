import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, readFile, rm, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createEnvExample,
  createVercelConfig,
  createHealthEndpoint,
} from "../../src/transforms/generate-configs.js";

describe("createEnvExample", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should create .env.example with Supabase vars", async () => {
    const result = await createEnvExample(tempDir, false);

    expect(result.changed).toBe(true);
    expect(result.files).toEqual([".env.example"]);

    const content = await readFile(join(tempDir, ".env.example"), "utf-8");
    expect(content).toContain("VITE_SUPABASE_URL");
    expect(content).toContain("VITE_SUPABASE_ANON_KEY");
    expect(content).toContain("supabase.co");
  });

  it("should not overwrite existing .env.example", async () => {
    const existing = "EXISTING_VAR=value\n";
    await writeFile(join(tempDir, ".env.example"), existing);

    const result = await createEnvExample(tempDir, false);

    expect(result.changed).toBe(false);
    expect(result.description).toContain("already exists");

    const content = await readFile(join(tempDir, ".env.example"), "utf-8");
    expect(content).toBe(existing);
  });

  it("should not create file in dry-run mode", async () => {
    const result = await createEnvExample(tempDir, true);

    expect(result.changed).toBe(true);
    await expect(access(join(tempDir, ".env.example"))).rejects.toThrow();
  });
});

describe("createVercelConfig", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should create vercel.json with SPA rewrites", async () => {
    const result = await createVercelConfig(tempDir, false);

    expect(result.changed).toBe(true);
    expect(result.files).toEqual(["vercel.json"]);

    const content = JSON.parse(
      await readFile(join(tempDir, "vercel.json"), "utf-8")
    );
    expect(content.rewrites).toBeDefined();
    expect(content.rewrites[0]).toEqual({
      source: "/(.*)",
      destination: "/index.html",
    });
  });

  it("should include Cache-Control header for API routes", async () => {
    await createVercelConfig(tempDir, false);

    const content = JSON.parse(
      await readFile(join(tempDir, "vercel.json"), "utf-8")
    );
    expect(content.headers).toBeDefined();
    expect(content.headers[0].source).toBe("/api/(.*)");
    expect(content.headers[0].headers[0].key).toBe("Cache-Control");
  });

  it("should not overwrite existing vercel.json", async () => {
    const existing = JSON.stringify({ builds: [] });
    await writeFile(join(tempDir, "vercel.json"), existing);

    const result = await createVercelConfig(tempDir, false);

    expect(result.changed).toBe(false);
    expect(result.description).toContain("already exists");
  });

  it("should not create file in dry-run mode", async () => {
    const result = await createVercelConfig(tempDir, true);

    expect(result.changed).toBe(true);
    await expect(access(join(tempDir, "vercel.json"))).rejects.toThrow();
  });
});

describe("createHealthEndpoint", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should create api/health.js endpoint", async () => {
    const result = await createHealthEndpoint(tempDir, false);

    expect(result.changed).toBe(true);
    expect(result.files).toEqual(["api/health.js"]);

    const content = await readFile(
      join(tempDir, "api/health.js"),
      "utf-8"
    );
    expect(content).toContain("export default function handler");
    expect(content).toContain("status");
    expect(content).toContain("ok");
    expect(content).toContain("timestamp");
  });

  it("should create api/ directory if it doesn't exist", async () => {
    await createHealthEndpoint(tempDir, false);

    await expect(access(join(tempDir, "api"))).resolves.toBeUndefined();
  });

  it("should not overwrite existing api/health.js", async () => {
    await mkdir(join(tempDir, "api"), { recursive: true });
    const existing = "module.exports = (req, res) => res.send('custom');\n";
    await writeFile(join(tempDir, "api/health.js"), existing);

    const result = await createHealthEndpoint(tempDir, false);

    expect(result.changed).toBe(false);
    expect(result.description).toContain("already exists");

    const content = await readFile(join(tempDir, "api/health.js"), "utf-8");
    expect(content).toBe(existing);
  });

  it("should not create file in dry-run mode", async () => {
    const result = await createHealthEndpoint(tempDir, true);

    expect(result.changed).toBe(true);
    await expect(access(join(tempDir, "api/health.js"))).rejects.toThrow();
  });

  it("should not create api/ directory in dry-run mode", async () => {
    await createHealthEndpoint(tempDir, true);

    await expect(access(join(tempDir, "api"))).rejects.toThrow();
  });
});
