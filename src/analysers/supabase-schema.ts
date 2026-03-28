import { join } from "node:path";
import { readTextFile, findFiles } from "../utils/files.js";
import type { SupabaseSchemaSummary } from "../types.js";

/**
 * Extract a summary of the Supabase schema from the generated types file
 * and migration SQL files.
 */
export async function analyseSupabaseSchema(
  projectPath: string
): Promise<SupabaseSchemaSummary> {
  const summary: SupabaseSchemaSummary = {
    tables: [],
    views: [],
    functions: [],
    enums: [],
  };

  // Try to extract from the Supabase generated types file first
  const typesPath = join(
    projectPath,
    "src/integrations/supabase/types.ts"
  );
  const typesContent = await readTextFile(typesPath);

  if (typesContent) {
    // Extract table names from the Tables interface
    const tableMatches = typesContent.matchAll(
      /^\s{4,8}(\w+):\s*\{/gm
    );
    for (const match of tableMatches) {
      if (!summary.tables.includes(match[1])) {
        summary.tables.push(match[1]);
      }
    }
  }

  // Also scan migration files for additional schema info
  const migrationFiles = await findFiles(
    projectPath,
    "supabase/migrations/**/*.sql"
  );

  for (const filePath of migrationFiles) {
    const content = await readTextFile(filePath);
    if (!content) continue;

    // Extract CREATE TABLE names
    const tableMatches = content.matchAll(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["']?(\w+)["']?/gi
    );
    for (const match of tableMatches) {
      if (!summary.tables.includes(match[1])) {
        summary.tables.push(match[1]);
      }
    }

    // Extract CREATE VIEW names
    const viewMatches = content.matchAll(
      /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?["']?(\w+)["']?/gi
    );
    for (const match of viewMatches) {
      if (!summary.views.includes(match[1])) {
        summary.views.push(match[1]);
      }
    }

    // Extract CREATE FUNCTION names
    const funcMatches = content.matchAll(
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?["']?(\w+)["']?/gi
    );
    for (const match of funcMatches) {
      if (!summary.functions.includes(match[1])) {
        summary.functions.push(match[1]);
      }
    }

    // Extract CREATE TYPE ... AS ENUM names
    const enumMatches = content.matchAll(
      /CREATE\s+TYPE\s+(?:public\.)?["']?(\w+)["']?\s+AS\s+ENUM/gi
    );
    for (const match of enumMatches) {
      if (!summary.enums.includes(match[1])) {
        summary.enums.push(match[1]);
      }
    }
  }

  return summary;
}
