import { join } from "node:path";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { log } from "../utils/logger.js";
import { fileExists } from "../utils/files.js";

const LOVABLE_DEPS = [
  "@lovable.dev/cloud-auth-js",
  "@lovable.dev/sdk",
  "lovable-tagger",
];

export interface TransformResult {
  changed: boolean;
  description: string;
  files: string[];
}

/**
 * Remove Lovable-specific dependencies from package.json.
 */
export async function removeLovableDeps(
  projectPath: string,
  dryRun: boolean,
  backup: boolean
): Promise<TransformResult> {
  const pkgPath = join(projectPath, "package.json");

  if (!(await fileExists(pkgPath))) {
    return { changed: false, description: "No package.json found", files: [] };
  }

  const raw = await readFile(pkgPath, "utf-8");
  const pkg = JSON.parse(raw);
  const removed: string[] = [];

  for (const dep of LOVABLE_DEPS) {
    if (pkg.dependencies?.[dep]) {
      removed.push(`${dep} (dependency)`);
      if (!dryRun) delete pkg.dependencies[dep];
    }
    if (pkg.devDependencies?.[dep]) {
      removed.push(`${dep} (devDependency)`);
      if (!dryRun) delete pkg.devDependencies[dep];
    }
  }

  if (removed.length === 0) {
    return {
      changed: false,
      description: "No Lovable dependencies found",
      files: [],
    };
  }

  if (!dryRun) {
    if (backup) {
      await copyFile(pkgPath, `${pkgPath}.bak`);
    }
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  }

  return {
    changed: true,
    description: `Removed: ${removed.join(", ")}`,
    files: ["package.json"],
  };
}
