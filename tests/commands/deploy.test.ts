import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtemp,
  writeFile,
  rm,
  mkdir,
  readFile,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  isValidSupabaseRef,
  runSupabaseCommands,
  buildEnvVarsList,
  detectCustomDomain,
  getDnsInstructions,
  runHealthCheck,
  getUptimeRobotInstructions,
  type ExecFn,
  type FetchFn,
} from "../../src/commands/deploy.js";

// ---------------------------------------------------------------------------
// isValidSupabaseRef
// ---------------------------------------------------------------------------

describe("isValidSupabaseRef", () => {
  it("should accept a valid lowercase alphanumeric ref", () => {
    expect(isValidSupabaseRef("abcdefghij1234567890")).toBe(true);
  });

  it("should accept a short ref", () => {
    expect(isValidSupabaseRef("a")).toBe(true);
  });

  it("should reject empty string", () => {
    expect(isValidSupabaseRef("")).toBe(false);
  });

  it("should reject uppercase characters", () => {
    expect(isValidSupabaseRef("ABCdef")).toBe(false);
  });

  it("should reject special characters", () => {
    expect(isValidSupabaseRef("abc;rm -rf /")).toBe(false);
    expect(isValidSupabaseRef("abc def")).toBe(false);
    expect(isValidSupabaseRef("abc-def")).toBe(false);
    expect(isValidSupabaseRef("abc.def")).toBe(false);
  });

  it("should reject refs longer than 40 characters", () => {
    expect(isValidSupabaseRef("a".repeat(41))).toBe(false);
  });

  it("should accept refs up to 40 characters", () => {
    expect(isValidSupabaseRef("a".repeat(40))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runSupabaseCommands
// ---------------------------------------------------------------------------

describe("runSupabaseCommands", () => {
  const mockExecSuccess: ExecFn = async () => ({
    stdout: "Success",
    stderr: "",
  });

  it("should return success when both commands succeed", async () => {
    const result = await runSupabaseCommands(
      "/tmp/project",
      "abcdef123456",
      mockExecSuccess
    );

    expect(result.linkOk).toBe(true);
    expect(result.pushOk).toBe(true);
    expect(result.linkOutput).toBe("Success");
    expect(result.pushOutput).toBe("Success");
  });

  it("should call exec with correct link command", async () => {
    const calls: string[] = [];
    const trackingExec: ExecFn = async (cmd) => {
      calls.push(cmd);
      return { stdout: "ok", stderr: "" };
    };

    await runSupabaseCommands("/tmp/proj", "myref123", trackingExec);

    expect(calls[0]).toBe("supabase link --project-ref myref123");
    expect(calls[1]).toBe("supabase db push");
  });

  it("should pass project path as cwd", async () => {
    const cwds: string[] = [];
    const trackingExec: ExecFn = async (_cmd, opts) => {
      cwds.push(opts.cwd);
      return { stdout: "", stderr: "" };
    };

    await runSupabaseCommands("/my/project", "ref123", trackingExec);

    expect(cwds[0]).toBe("/my/project");
    expect(cwds[1]).toBe("/my/project");
  });

  it("should handle link failure without running push", async () => {
    const calls: string[] = [];
    const failingExec: ExecFn = async (cmd) => {
      calls.push(cmd);
      throw new Error("supabase: command not found");
    };

    const result = await runSupabaseCommands(
      "/tmp/project",
      "abcdef",
      failingExec
    );

    expect(result.linkOk).toBe(false);
    expect(result.pushOk).toBe(false);
    expect(result.linkOutput).toContain("command not found");
    expect(calls).toHaveLength(1); // push should NOT have been called
  });

  it("should handle push failure after successful link", async () => {
    let callCount = 0;
    const pushFailExec: ExecFn = async () => {
      callCount++;
      if (callCount === 1) return { stdout: "Linked", stderr: "" };
      throw new Error("push failed: migration conflict");
    };

    const result = await runSupabaseCommands(
      "/tmp/project",
      "abcdef",
      pushFailExec
    );

    expect(result.linkOk).toBe(true);
    expect(result.pushOk).toBe(false);
    expect(result.linkOutput).toBe("Linked");
    expect(result.pushOutput).toContain("migration conflict");
  });

  it("should reject invalid project ref without calling exec", async () => {
    const calls: string[] = [];
    const trackingExec: ExecFn = async (cmd) => {
      calls.push(cmd);
      return { stdout: "", stderr: "" };
    };

    const result = await runSupabaseCommands(
      "/tmp/project",
      "bad;ref",
      trackingExec
    );

    expect(result.linkOk).toBe(false);
    expect(result.linkOutput).toContain("Invalid project ref");
    expect(calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildEnvVarsList
// ---------------------------------------------------------------------------

describe("buildEnvVarsList", () => {
  it("should return VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY", () => {
    const vars = buildEnvVarsList("myproject123");

    expect(vars).toHaveLength(2);
    expect(vars[0].key).toBe("VITE_SUPABASE_URL");
    expect(vars[1].key).toBe("VITE_SUPABASE_ANON_KEY");
  });

  it("should include the project ref in the Supabase URL", () => {
    const vars = buildEnvVarsList("abc123xyz");

    expect(vars[0].value).toBe("https://abc123xyz.supabase.co");
  });

  it("should include descriptions for each var", () => {
    const vars = buildEnvVarsList("ref");

    for (const v of vars) {
      expect(v.description).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// detectCustomDomain
// ---------------------------------------------------------------------------

describe("detectCustomDomain", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lovable-eject-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should detect YOUR_DOMAIN.com placeholder in source files", async () => {
    await mkdir(join(tempDir, "src"), { recursive: true });
    await writeFile(
      join(tempDir, "src/config.ts"),
      `const url = "https://YOUR_DOMAIN.com/callback";\n`
    );

    const domain = await detectCustomDomain(tempDir);

    expect(domain).toBe("YOUR_DOMAIN.com");
  });

  it("should detect VITE_APP_URL in .env.example", async () => {
    await writeFile(
      join(tempDir, ".env.example"),
      "VITE_SUPABASE_URL=x\nVITE_APP_URL=https://myapp.example.com\n"
    );

    const domain = await detectCustomDomain(tempDir);

    expect(domain).toBe("myapp.example.com");
  });

  it("should prefer .env.example over source file scan", async () => {
    await writeFile(
      join(tempDir, ".env.example"),
      "VITE_APP_URL=https://preferred.example.com\n"
    );
    await mkdir(join(tempDir, "src"), { recursive: true });
    await writeFile(
      join(tempDir, "src/app.ts"),
      `const url = "https://YOUR_DOMAIN.com";\n`
    );

    const domain = await detectCustomDomain(tempDir);

    expect(domain).toBe("preferred.example.com");
  });

  it("should return null when no domain references found", async () => {
    await mkdir(join(tempDir, "src"), { recursive: true });
    await writeFile(join(tempDir, "src/app.ts"), `const x = 1;\n`);

    const domain = await detectCustomDomain(tempDir);

    expect(domain).toBeNull();
  });

  it("should return null for empty project", async () => {
    const domain = await detectCustomDomain(tempDir);

    expect(domain).toBeNull();
  });

  it("should handle .env.example without VITE_APP_URL", async () => {
    await writeFile(
      join(tempDir, ".env.example"),
      "VITE_SUPABASE_URL=https://x.supabase.co\n"
    );

    const domain = await detectCustomDomain(tempDir);

    expect(domain).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getDnsInstructions
// ---------------------------------------------------------------------------

describe("getDnsInstructions", () => {
  it("should return CNAME records", () => {
    const records = getDnsInstructions("myapp.com");

    expect(records).toHaveLength(2);
    expect(records[0].type).toBe("CNAME");
    expect(records[1].type).toBe("CNAME");
  });

  it("should include root and www records", () => {
    const records = getDnsInstructions("myapp.com");

    const names = records.map((r) => r.name);
    expect(names).toContain("@");
    expect(names).toContain("www");
  });

  it("should point to Vercel DNS", () => {
    const records = getDnsInstructions("myapp.com");

    for (const r of records) {
      expect(r.value).toContain("vercel-dns.com");
    }
  });
});

// ---------------------------------------------------------------------------
// runHealthCheck
// ---------------------------------------------------------------------------

describe("runHealthCheck", () => {
  function createMockFetch(
    status: number,
    body: unknown
  ): FetchFn {
    return async () =>
      ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      }) as Response;
  }

  it("should return ok=true for a 200 response", async () => {
    const mockFetch = createMockFetch(200, {
      status: "ok",
      timestamp: "2024-01-01",
    });

    const result = await runHealthCheck(
      "https://myapp.vercel.app",
      mockFetch
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      status: "ok",
      timestamp: "2024-01-01",
    });
  });

  it("should return ok=false for a 500 response", async () => {
    const mockFetch = createMockFetch(500, { error: "Internal error" });

    const result = await runHealthCheck(
      "https://myapp.vercel.app",
      mockFetch
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  it("should return ok=false for a 404 response", async () => {
    const mockFetch = createMockFetch(404, { error: "Not found" });

    const result = await runHealthCheck(
      "https://myapp.vercel.app",
      mockFetch
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });

  it("should handle network errors gracefully", async () => {
    const failingFetch: FetchFn = async () => {
      throw new Error("fetch failed: ECONNREFUSED");
    };

    const result = await runHealthCheck(
      "https://myapp.vercel.app",
      failingFetch
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
    expect(result.status).toBeUndefined();
  });

  it("should append /api/health to the URL", async () => {
    let calledUrl = "";
    const trackingFetch: FetchFn = async (url) => {
      calledUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ok" }),
      } as Response;
    };

    await runHealthCheck("https://myapp.vercel.app", trackingFetch);

    expect(calledUrl).toBe("https://myapp.vercel.app/api/health");
  });

  it("should strip trailing slash before appending path", async () => {
    let calledUrl = "";
    const trackingFetch: FetchFn = async (url) => {
      calledUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ok" }),
      } as Response;
    };

    await runHealthCheck("https://myapp.vercel.app/", trackingFetch);

    expect(calledUrl).toBe("https://myapp.vercel.app/api/health");
  });
});

// ---------------------------------------------------------------------------
// getUptimeRobotInstructions
// ---------------------------------------------------------------------------

describe("getUptimeRobotInstructions", () => {
  it("should return an array of instruction strings", () => {
    const instructions = getUptimeRobotInstructions(
      "https://myapp.vercel.app/api/health"
    );

    expect(instructions.length).toBeGreaterThan(0);
    for (const line of instructions) {
      expect(typeof line).toBe("string");
    }
  });

  it("should include the health URL in instructions", () => {
    const url = "https://custom-app.vercel.app/api/health";
    const instructions = getUptimeRobotInstructions(url);

    const joined = instructions.join("\n");
    expect(joined).toContain(url);
  });

  it("should mention uptimerobot.com", () => {
    const instructions = getUptimeRobotInstructions(
      "https://x.vercel.app/api/health"
    );

    const joined = instructions.join("\n");
    expect(joined).toContain("uptimerobot.com");
  });

  it("should recommend 5-minute monitoring interval", () => {
    const instructions = getUptimeRobotInstructions(
      "https://x.vercel.app/api/health"
    );

    const joined = instructions.join("\n");
    expect(joined).toContain("5 minutes");
  });
});
