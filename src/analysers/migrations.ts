import { findFiles, readTextFile } from "../utils/files.js";
import type { MigrationAnalysis, MigrationIssue } from "../types.js";

/**
 * Analyse SQL migration files for common Lovable migration issues.
 */
export async function analyseMigrations(
  projectPath: string
): Promise<MigrationAnalysis> {
  const migrationFiles = await findFiles(
    projectPath,
    "supabase/migrations/**/*.sql"
  );

  const issues: MigrationIssue[] = [];

  for (const filePath of migrationFiles) {
    const content = await readTextFile(filePath);
    if (!content) continue;

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check: CREATE TABLE without IF NOT EXISTS
      if (
        /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i.test(line) &&
        !/--/.test(line.split("CREATE")[0]) // not commented out
      ) {
        issues.push({
          filePath,
          line: lineNum,
          type: "missing-if-not-exists",
          description: "CREATE TABLE without IF NOT EXISTS",
          fix: "Add IF NOT EXISTS after CREATE TABLE",
        });
      }

      // Check: DROP FUNCTION without CASCADE
      if (
        /DROP\s+FUNCTION\s+IF\s+EXISTS/i.test(line) &&
        !/CASCADE/i.test(line)
      ) {
        issues.push({
          filePath,
          line: lineNum,
          type: "missing-cascade",
          description: "DROP FUNCTION IF EXISTS without CASCADE",
          fix: "Add CASCADE at the end of the statement",
        });
      }

      // Check: jsonb_set without COALESCE
      if (/jsonb_set\s*\(/i.test(line) && !/COALESCE/i.test(line)) {
        issues.push({
          filePath,
          line: lineNum,
          type: "unsafe-jsonb-set",
          description: "jsonb_set without COALESCE null guard",
          fix: "Wrap column with COALESCE(col, '{}'::jsonb)",
        });
      }
    }
  }

  return {
    fileCount: migrationFiles.length,
    issues,
  };
}
