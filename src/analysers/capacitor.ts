import { join } from "node:path";
import { readTextFile, fileExists } from "../utils/files.js";
import type { CapacitorConfig } from "../types.js";

/**
 * Detect Capacitor mobile configuration and check for Lovable deep link schemes.
 */
export async function analyseCapacitor(
  projectPath: string
): Promise<CapacitorConfig | null> {
  // Check for capacitor.config.ts or capacitor.config.json
  const tsConfigPath = join(projectPath, "capacitor.config.ts");
  const jsonConfigPath = join(projectPath, "capacitor.config.json");

  let content: string | null = null;
  let isTs = false;

  if (await fileExists(tsConfigPath)) {
    content = await readTextFile(tsConfigPath);
    isTs = true;
  } else if (await fileExists(jsonConfigPath)) {
    content = await readTextFile(jsonConfigPath);
  }

  if (!content) return null;

  // Extract appId
  const appIdMatch = content.match(/appId\s*[:=]\s*['"]([^'"]+)['"]/);
  const appNameMatch = content.match(/appName\s*[:=]\s*['"]([^'"]+)['"]/);

  if (!appIdMatch) return null;

  const appId = appIdMatch[1];
  const appName = appNameMatch?.[1] ?? "Unknown";

  // Check if deep links reference Lovable's scheme
  const hasLovableDeepLinks = /app\.lovable\./i.test(content);

  return {
    appId,
    appName,
    hasLovableDeepLinks,
  };
}
