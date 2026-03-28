import { join } from "node:path";
import { readJsonFile } from "../utils/files.js";
import type { LovableDependency } from "../types.js";

/** Packages that are Lovable-specific and should be removed */
const LOVABLE_PACKAGES = [
  "@lovable.dev/cloud-auth-js",
  "lovable-tagger",
  "@lovable.dev/sdk",
];

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Scan package.json for Lovable-specific dependencies.
 */
export async function analyseDependencies(
  projectPath: string
): Promise<LovableDependency[]> {
  const pkgPath = join(projectPath, "package.json");
  const pkg = await readJsonFile<PackageJson>(pkgPath);

  if (!pkg) return [];

  const found: LovableDependency[] = [];

  for (const name of LOVABLE_PACKAGES) {
    if (pkg.dependencies?.[name]) {
      found.push({
        name,
        version: pkg.dependencies[name],
        type: "dependency",
      });
    }
    if (pkg.devDependencies?.[name]) {
      found.push({
        name,
        version: pkg.devDependencies[name],
        type: "devDependency",
      });
    }
  }

  return found;
}
