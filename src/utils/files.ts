import { readFile, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { glob } from "glob";

/**
 * Resolve and validate that a project path exists and looks like a Lovable project.
 */
export async function resolveProjectPath(inputPath: string): Promise<string> {
  const resolved = resolve(inputPath);
  await access(resolved);
  return resolved;
}

/**
 * Check if a file exists without throwing.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read and parse a JSON file. Returns null if file doesn't exist or is invalid.
 */
export async function readJsonFile<T = unknown>(
  filePath: string
): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Read a file as UTF-8 text. Returns null if file doesn't exist.
 */
export async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Find files matching a glob pattern relative to a project root.
 */
export async function findFiles(
  projectPath: string,
  pattern: string
): Promise<string[]> {
  return glob(pattern, {
    cwd: projectPath,
    absolute: true,
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**",
      "**/package-lock.json",
      "**/yarn.lock",
      "**/pnpm-lock.yaml",
      "**/bun.lockb",
      "**/lovable-eject-report.html",
    ],
  });
}

/**
 * Search for a pattern in all source files and return matches with line numbers.
 */
export async function grepFiles(
  projectPath: string,
  pattern: RegExp,
  fileGlob = "**/*.{ts,tsx,js,jsx,json}"
): Promise<Array<{ filePath: string; line: number; content: string }>> {
  const files = await findFiles(projectPath, fileGlob);
  const matches: Array<{ filePath: string; line: number; content: string }> =
    [];

  for (const filePath of files) {
    const content = await readTextFile(filePath);
    if (!content) continue;

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        matches.push({
          filePath,
          line: i + 1,
          content: lines[i].trim(),
        });
      }
    }
  }

  return matches;
}
