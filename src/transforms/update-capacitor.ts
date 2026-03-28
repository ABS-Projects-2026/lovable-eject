import { join } from "node:path";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { fileExists } from "../utils/files.js";
import type { TransformResult } from "./remove-deps.js";

/**
 * Update Capacitor config to replace Lovable app ID and deep link scheme.
 *
 * Replaces:
 *   - appId: "app.lovable.<UUID>" → "com.yourapp.name" (placeholder)
 *   - Any deep link scheme references to app.lovable
 */
export async function updateCapacitorConfig(
  projectPath: string,
  dryRun: boolean,
  backup: boolean
): Promise<TransformResult> {
  const tsConfig = join(projectPath, "capacitor.config.ts");
  const jsonConfig = join(projectPath, "capacitor.config.json");

  let configPath: string | null = null;
  if (await fileExists(tsConfig)) configPath = tsConfig;
  else if (await fileExists(jsonConfig)) configPath = jsonConfig;

  if (!configPath) {
    return {
      changed: false,
      description: "No Capacitor config found",
      files: [],
    };
  }

  const original = await readFile(configPath, "utf-8");
  let content = original;

  // Replace Lovable app ID pattern: app.lovable.<UUID>
  content = content.replace(
    /app\.lovable\.[a-f0-9-]+/gi,
    "com.yourapp.name"
  );

  if (content === original) {
    return {
      changed: false,
      description: "Capacitor config has no Lovable references",
      files: [],
    };
  }

  if (!dryRun) {
    if (backup) {
      await copyFile(configPath, `${configPath}.bak`);
    }
    await writeFile(configPath, content, "utf-8");
  }

  return {
    changed: true,
    description: "Updated Capacitor app ID (was Lovable scheme) — update 'com.yourapp.name' to your real app ID",
    files: [configPath],
  };
}
