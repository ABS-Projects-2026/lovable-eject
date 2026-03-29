import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyInstall, verifyBuild, runVerification } from "../../src/transforms/verify.js";

// Mock child_process.exec
vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

import { exec } from "node:child_process";
const mockExec = vi.mocked(exec);

beforeEach(() => {
  vi.clearAllMocks();
});

function setupExec(results: Array<{ stdout?: string; stderr?: string; error?: Error | null }>) {
  let callIndex = 0;
  mockExec.mockImplementation((_cmd, _opts, callback) => {
    const result = results[callIndex++] ?? { stdout: "", stderr: "", error: null };
    const cb = callback as (error: Error | null, stdout: string, stderr: string) => void;
    if (result.error) {
      cb(result.error, result.stdout ?? "", result.stderr ?? "");
    } else {
      cb(null, result.stdout ?? "", result.stderr ?? "");
    }
    return {} as ReturnType<typeof exec>;
  });
}

describe("verifyInstall", () => {
  it("returns success when npm install succeeds", async () => {
    setupExec([{ stdout: "added 100 packages", stderr: "" }]);

    const result = await verifyInstall("/fake/path");

    expect(result.success).toBe(true);
    expect(result.output).toContain("added 100 packages");
    expect(result.errors).toEqual([]);
  });

  it("returns failure with error lines when npm install fails", async () => {
    setupExec([{
      stdout: "",
      stderr: "npm ERR! code ERESOLVE\nnpm ERR! peer dep conflict",
      error: new Error("exit code 1"),
    }]);

    const result = await verifyInstall("/fake/path");

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("verifyBuild", () => {
  it("returns success when build succeeds", async () => {
    setupExec([{ stdout: "Build completed in 3.2s", stderr: "" }]);

    const result = await verifyBuild("/fake/path");

    expect(result.success).toBe(true);
    expect(result.output).toContain("Build completed");
  });

  it("returns failure with TS errors when build fails", async () => {
    setupExec([{
      stdout: "",
      stderr: "error TS2304: Cannot find name 'lovable'\nError: Build failed",
      error: new Error("exit code 1"),
    }]);

    const result = await verifyBuild("/fake/path");

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("TS2304") || e.includes("Error"))).toBe(true);
  });
});

describe("runVerification", () => {
  it("runs install then build when install succeeds", async () => {
    setupExec([
      { stdout: "added 100 packages", stderr: "" },
      { stdout: "Build complete", stderr: "" },
    ]);

    const result = await runVerification("/fake/path");

    expect(result.install.success).toBe(true);
    expect(result.build).not.toBeNull();
    expect(result.build!.success).toBe(true);
  });

  it("skips build when install fails", async () => {
    setupExec([{
      stdout: "",
      stderr: "npm ERR! code ERESOLVE",
      error: new Error("exit code 1"),
    }]);

    const result = await runVerification("/fake/path");

    expect(result.install.success).toBe(false);
    expect(result.build).toBeNull();
  });
});
