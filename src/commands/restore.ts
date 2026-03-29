import { join, relative, dirname, basename } from "node:path";
import { readdir, rename, rm, stat, cp } from "node:fs/promises";
import { log, spinner } from "../utils/logger.js";
import { resolveProjectPath, fileExists } from "../utils/files.js";

export interface RestoreResult {
  restored: string[];
  removed: string[];
  errors: string[];
}

const EXCLUDE_DIRS = new Set(["node_modules", ".git", "dist"]);

/**
 * Known generated files that the transform creates without a .bak counterpart.
 */
const GENERATED_FILES = [".env.example", "vercel.json", "api/health.js"];

/**
 * Recursively find all .bak files and directories in the project, excluding node_modules/.git/dist.
 */
async function findBakEntries(
  dir: string
): Promise<Array<{ path: string; isDirectory: boolean }>> {
  const entries: Array<{ path: string; isDirectory: boolean }> = [];

  async function walk(current: string) {
    const items = await readdir(current, { withFileTypes: true });
    for (const item of items) {
      if (EXCLUDE_DIRS.has(item.name)) continue;
      const fullPath = join(current, item.name);

      if (item.name.endsWith(".bak")) {
        const isDir = item.isDirectory();
        entries.push({ path: fullPath, isDirectory: isDir });
      } else if (item.isDirectory()) {
        await walk(fullPath);
      }
    }
  }

  await walk(dir);
  return entries;
}

/**
 * Core restore logic — revert .bak files and remove generated files.
 */
export async function restoreProject(
  projectPath: string,
  dryRun: boolean
): Promise<RestoreResult> {
  const restored: string[] = [];
  const removed: string[] = [];
  const errors: string[] = [];

  // 1. Find all .bak entries
  const bakEntries = await findBakEntries(projectPath);

  // Record which original paths had .bak counterparts (before we rename them)
  const hadBak = new Set(
    bakEntries.map((e) => relative(projectPath, e.path.replace(/\.bak$/, "")))
  );

  // 2. Restore each .bak file/directory
  for (const entry of bakEntries) {
    const originalPath = entry.path.replace(/\.bak$/, "");
    const relPath = relative(projectPath, originalPath);

    try {
      if (!dryRun) {
        if (entry.isDirectory) {
          // Remove the current version if it exists, then rename backup
          if (await fileExists(originalPath)) {
            await rm(originalPath, { recursive: true, force: true });
          }
          await rename(entry.path, originalPath);
        } else {
          // For files: overwrite current with backup, then remove backup
          await rename(entry.path, originalPath);
        }
      }
      restored.push(relPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Failed to restore ${relPath}: ${msg}`);
    }
  }

  // 3. Remove generated files that have no .bak counterpart (meaning they didn't exist before transform)
  for (const genFile of GENERATED_FILES) {
    const filePath = join(projectPath, genFile);

    // Only remove if the file exists AND it didn't have a .bak (it was created by transform, not pre-existing)
    if ((await fileExists(filePath)) && !hadBak.has(genFile)) {
      try {
        if (!dryRun) {
          await rm(filePath, { force: true });
          // Clean up empty api/ directory if we removed api/health.js
          if (genFile === "api/health.js") {
            const apiDir = dirname(filePath);
            const remaining = await readdir(apiDir).catch(() => []);
            if (remaining.length === 0) {
              await rm(apiDir, { recursive: true, force: true });
            }
          }
        }
        removed.push(genFile);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to remove ${genFile}: ${msg}`);
      }
    }
  }

  return { restored, removed, errors };
}

interface RestoreOptions {
  dryRun?: boolean;
}

/**
 * CLI command handler for `lovable-eject restore <path>`.
 */
export async function restoreCommand(
  path: string,
  options: RestoreOptions
): Promise<void> {
  try {
    const projectPath = await resolveProjectPath(path);
    const dryRun = options.dryRun ?? false;

    if (dryRun) {
      log.info("Dry run mode — no files will be modified\n");
    }

    log.heading("Restore Original Files");

    const spin = spinner("Scanning for .bak files...");
    const result = await restoreProject(projectPath, dryRun);
    spin.stop();

    if (result.restored.length === 0 && result.removed.length === 0) {
      log.info("No .bak files found — nothing to restore");
      return;
    }

    // Show restored files
    if (result.restored.length > 0) {
      log.success(
        `Restored ${result.restored.length} file(s)${dryRun ? " (dry run)" : ""}`
      );
      for (const f of result.restored) {
        log.dim(`  ← ${f}`);
      }
    }

    // Show removed generated files
    if (result.removed.length > 0) {
      log.success(
        `Removed ${result.removed.length} generated file(s)${dryRun ? " (dry run)" : ""}`
      );
      for (const f of result.removed) {
        log.dim(`  ✕ ${f}`);
      }
    }

    // Show errors
    for (const err of result.errors) {
      log.error(err);
    }

    // Summary
    log.heading("Summary");
    log.info(
      `Restored ${result.restored.length} files, removed ${result.removed.length} generated files${dryRun ? " (dry run)" : ""}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Restore failed: ${message}`);
    process.exit(1);
  }
}
