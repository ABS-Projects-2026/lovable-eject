import type {
  RiskAssessment,
  RiskLevel,
  LovableDependency,
  LovableFileReference,
  MigrationAnalysis,
  SupabaseSchemaSummary,
  CapacitorConfig,
} from "../types.js";

interface RiskInput {
  lovableDeps: LovableDependency[];
  lovableFiles: LovableFileReference[];
  migrations: MigrationAnalysis;
  supabaseSchema: SupabaseSchemaSummary;
  capacitor: CapacitorConfig | null;
}

/**
 * Assess the overall migration risk based on all analysis results.
 *
 * Score ranges:
 *   0-3  → simple   (standard Lovable project, straightforward migration)
 *   4-7  → moderate (some complications, but manageable)
 *   8+   → complex  (significant manual intervention likely needed)
 */
export function assessRisk(input: RiskInput): RiskAssessment {
  let score = 0;
  const reasons: string[] = [];

  // Dependency complexity
  if (input.lovableDeps.length === 0) {
    reasons.push("No Lovable dependencies found — may already be partially migrated");
  } else {
    score += input.lovableDeps.length;
    reasons.push(
      `${input.lovableDeps.length} Lovable dependency(ies) to remove`
    );
  }

  // File reference count
  const oauthCalls = input.lovableFiles.filter(
    (f) => f.referenceType === "oauth-call"
  );
  if (oauthCalls.length > 3) {
    score += 2;
    reasons.push(
      `${oauthCalls.length} OAuth call sites to transform (more than typical)`
    );
  } else if (oauthCalls.length > 0) {
    score += 1;
    reasons.push(`${oauthCalls.length} OAuth call site(s) to transform`);
  }

  // Migration issues
  if (input.migrations.issues.length > 10) {
    score += 3;
    reasons.push(
      `${input.migrations.issues.length} migration issues — high risk of deployment errors`
    );
  } else if (input.migrations.issues.length > 0) {
    score += 1;
    reasons.push(
      `${input.migrations.issues.length} migration issue(s) to fix`
    );
  }

  // Schema complexity
  const totalEntities =
    input.supabaseSchema.tables.length +
    input.supabaseSchema.functions.length +
    input.supabaseSchema.views.length;
  if (totalEntities > 30) {
    score += 2;
    reasons.push(`Large schema (${totalEntities} entities) — migration may take longer`);
  }

  // Mobile / Capacitor
  if (input.capacitor) {
    score += 2;
    reasons.push("Capacitor mobile config detected — deep links and app ID need updating");
    if (input.capacitor.hasLovableDeepLinks) {
      score += 1;
      reasons.push("Deep links use Lovable scheme — requires manual update in app stores");
    }
  }

  // Determine level
  let level: RiskLevel;
  if (score <= 3) {
    level = "simple";
  } else if (score <= 7) {
    level = "moderate";
  } else {
    level = "complex";
  }

  return { level, score, reasons };
}
