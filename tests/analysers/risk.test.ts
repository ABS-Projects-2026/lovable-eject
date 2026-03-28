import { describe, it, expect } from "vitest";
import { assessRisk } from "../../src/analysers/risk.js";

const emptyInput = {
  lovableDeps: [],
  lovableFiles: [],
  migrations: { fileCount: 0, issues: [] },
  supabaseSchema: { tables: [], views: [], functions: [], enums: [] },
  capacitor: null,
};

describe("assessRisk", () => {
  it("should return simple for a clean project with no Lovable deps", () => {
    const result = assessRisk(emptyInput);
    expect(result.level).toBe("simple");
    expect(result.score).toBeLessThanOrEqual(3);
  });

  it("should increase risk for Lovable dependencies", () => {
    const result = assessRisk({
      ...emptyInput,
      lovableDeps: [
        { name: "@lovable.dev/cloud-auth-js", version: "^1.0.0", type: "dependency" },
        { name: "lovable-tagger", version: "^2.0.0", type: "devDependency" },
      ],
    });

    expect(result.score).toBeGreaterThan(0);
  });

  it("should flag Capacitor as increased risk", () => {
    const withCap = assessRisk({
      ...emptyInput,
      capacitor: {
        appId: "com.example.app",
        appName: "My App",
        hasLovableDeepLinks: true,
      },
    });

    const withoutCap = assessRisk(emptyInput);

    expect(withCap.score).toBeGreaterThan(withoutCap.score);
    expect(withCap.reasons.some((r) => r.includes("Capacitor"))).toBe(true);
  });

  it("should return complex for projects with many migration issues", () => {
    const issues = Array.from({ length: 15 }, (_, i) => ({
      filePath: `migration_${i}.sql`,
      line: 1,
      type: "missing-if-not-exists" as const,
      description: "test",
      fix: "test",
    }));

    const result = assessRisk({
      ...emptyInput,
      lovableDeps: [
        { name: "@lovable.dev/cloud-auth-js", version: "^1.0.0", type: "dependency" },
        { name: "lovable-tagger", version: "^2.0.0", type: "devDependency" },
      ],
      migrations: { fileCount: 15, issues },
      capacitor: {
        appId: "app.lovable.abc123",
        appName: "My App",
        hasLovableDeepLinks: true,
      },
    });

    expect(result.level).toBe("complex");
  });
});
