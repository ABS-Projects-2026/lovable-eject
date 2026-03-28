import { join } from "node:path";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { fileExists } from "../utils/files.js";
import type { TransformResult } from "./remove-deps.js";

/**
 * Remove lovable-tagger plugin from vite.config.ts.
 *
 * Handles patterns like:
 *   - import { componentTagger } from "lovable-tagger";
 *   - componentTagger() in plugins array
 */
export async function removeTagger(
  projectPath: string,
  dryRun: boolean,
  backup: boolean
): Promise<TransformResult> {
  const vitePath = join(projectPath, "vite.config.ts");

  if (!(await fileExists(vitePath))) {
    return { changed: false, description: "No vite.config.ts found", files: [] };
  }

  const original = await readFile(vitePath, "utf-8");
  let content = original;

  // Remove the import line
  content = content.replace(
    /import\s*\{[^}]*\}\s*from\s*['"]lovable-tagger['"];\s*\n?/g,
    ""
  );

  // Remove mode === 'development' && componentTagger() pattern (must run before simpler pattern)
  content = content.replace(
    /\s*mode\s*===\s*['"]development['"]\s*&&\s*componentTagger\(\),?\s*\n?/g,
    "\n"
  );

  // Remove componentTagger() from plugins array
  // Handles: componentTagger(), with or without trailing comma
  content = content.replace(
    /\s*componentTagger\(\),?\s*\n?/g,
    "\n"
  );

  // Clean up empty plugins arrays or double commas
  content = content.replace(/,\s*,/g, ",");
  content = content.replace(/,\s*\]/g, "\n    ]");
  content = content.replace(/\[\s*,/g, "[");

  if (content === original) {
    return {
      changed: false,
      description: "No lovable-tagger reference in vite config",
      files: [],
    };
  }

  if (!dryRun) {
    if (backup) {
      await copyFile(vitePath, `${vitePath}.bak`);
    }
    await writeFile(vitePath, content, "utf-8");
  }

  return {
    changed: true,
    description: "Removed lovable-tagger from vite.config.ts",
    files: ["vite.config.ts"],
  };
}
