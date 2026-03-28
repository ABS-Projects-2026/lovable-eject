import { readFile, writeFile, copyFile } from "node:fs/promises";
import { findFiles } from "../utils/files.js";
import type { TransformResult } from "./remove-deps.js";

/**
 * Fix common issues in Supabase migration SQL files:
 *   - Add IF NOT EXISTS to CREATE TABLE statements
 *   - Add CASCADE to DROP FUNCTION IF EXISTS statements
 *   - Wrap jsonb_set calls with COALESCE null guard
 */
export async function fixMigrations(
  projectPath: string,
  dryRun: boolean,
  backup: boolean
): Promise<TransformResult> {
  const migrationFiles = await findFiles(
    projectPath,
    "supabase/migrations/**/*.sql"
  );

  const changedFiles: string[] = [];
  let totalFixes = 0;

  for (const filePath of migrationFiles) {
    const original = await readFile(filePath, "utf-8");
    let content = original;
    let fixes = 0;

    // Fix: CREATE TABLE without IF NOT EXISTS
    content = content.replace(
      /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\s+)/gi,
      (match) => {
        // Don't fix if inside a comment
        fixes++;
        return "CREATE TABLE IF NOT EXISTS ";
      }
    );

    // Fix: DROP FUNCTION IF EXISTS without CASCADE
    content = content.replace(
      /(DROP\s+FUNCTION\s+IF\s+EXISTS\s+[^;]+?)(\s*;)/gi,
      (match, before, semicolon) => {
        if (/CASCADE/i.test(before)) return match;
        fixes++;
        return `${before} CASCADE${semicolon}`;
      }
    );

    // Fix: jsonb_set without COALESCE
    // jsonb_set(column, ...) → jsonb_set(COALESCE(column, '{}'::jsonb), ...)
    content = content.replace(
      /jsonb_set\(\s*(\w+(?:\.\w+)?)\s*,/gi,
      (match, column) => {
        if (/COALESCE/i.test(match)) return match;
        fixes++;
        return `jsonb_set(COALESCE(${column}, '{}'::jsonb),`;
      }
    );

    if (content !== original) {
      changedFiles.push(filePath);
      totalFixes += fixes;
      if (!dryRun) {
        if (backup) {
          await copyFile(filePath, `${filePath}.bak`);
        }
        await writeFile(filePath, content, "utf-8");
      }
    }
  }

  if (changedFiles.length === 0) {
    return {
      changed: false,
      description: "No migration issues to fix",
      files: [],
    };
  }

  return {
    changed: true,
    description: `Applied ${totalFixes} fix(es) across ${changedFiles.length} migration file(s)`,
    files: changedFiles,
  };
}
