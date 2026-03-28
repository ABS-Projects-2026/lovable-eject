import { join } from "node:path";
import { rm, cp } from "node:fs/promises";
import { fileExists } from "../utils/files.js";
import type { TransformResult } from "./remove-deps.js";

/**
 * Delete the src/integrations/lovable/ folder.
 */
export async function deleteLovableIntegration(
  projectPath: string,
  dryRun: boolean,
  backup: boolean
): Promise<TransformResult> {
  const lovablePath = join(projectPath, "src/integrations/lovable");

  if (!(await fileExists(lovablePath))) {
    return {
      changed: false,
      description: "No src/integrations/lovable/ folder found",
      files: [],
    };
  }

  if (!dryRun) {
    if (backup) {
      const backupPath = join(projectPath, "src/integrations/lovable.bak");
      await cp(lovablePath, backupPath, { recursive: true });
    }
    await rm(lovablePath, { recursive: true, force: true });
  }

  return {
    changed: true,
    description: "Deleted src/integrations/lovable/ folder",
    files: ["src/integrations/lovable/"],
  };
}
