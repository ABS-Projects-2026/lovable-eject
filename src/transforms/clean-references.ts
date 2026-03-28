import { readFile, writeFile, copyFile } from "node:fs/promises";
import { findFiles } from "../utils/files.js";
import type { TransformResult } from "./remove-deps.js";

/**
 * Remove or replace Lovable domain references and OG image URLs.
 *
 * Handles:
 *   - *.lovable.app domain → placeholder for user's domain
 *   - lovable.dev/opengraph-image* → placeholder
 *   - lovable.dev/og-image* → placeholder
 */
export async function cleanLovableReferences(
  projectPath: string,
  dryRun: boolean,
  backup: boolean
): Promise<TransformResult> {
  const files = await findFiles(
    projectPath,
    "**/*.{ts,tsx,js,jsx,html,json}"
  );

  const changedFiles: string[] = [];

  for (const filePath of files) {
    const original = await readFile(filePath, "utf-8");
    let content = original;

    // Replace *.lovable.app domains with TODO placeholder
    content = content.replace(
      /https?:\/\/[\w-]+\.lovable\.app/g,
      "https://YOUR_DOMAIN.com"
    );

    // Replace Lovable OG image URLs
    content = content.replace(
      /https?:\/\/lovable\.dev\/opengraph-image[^"'\s)>]*/g,
      "https://YOUR_DOMAIN.com/og-image.png"
    );

    content = content.replace(
      /https?:\/\/lovable\.dev\/og-image[^"'\s)>]*/g,
      "https://YOUR_DOMAIN.com/og-image.png"
    );

    if (content !== original) {
      changedFiles.push(filePath);
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
      description: "No Lovable domain or OG references found",
      files: [],
    };
  }

  return {
    changed: true,
    description: `Cleaned Lovable references in ${changedFiles.length} file(s)`,
    files: changedFiles,
  };
}
