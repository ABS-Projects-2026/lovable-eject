import { readFile, writeFile, copyFile } from "node:fs/promises";
import { findFiles } from "../utils/files.js";
import type { TransformResult } from "./remove-deps.js";

/**
 * Replace Lovable OAuth calls with standard Supabase OAuth.
 *
 * Handles these patterns:
 *   - import { lovable } from '@/integrations/lovable'
 *     → import { supabase } from '@/integrations/supabase/client'
 *   - lovable.auth.signInWithOAuth(provider, { redirect_uri })
 *     → supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
 */
export async function replaceOAuthCalls(
  projectPath: string,
  dryRun: boolean,
  backup: boolean
): Promise<TransformResult> {
  const sourceFiles = await findFiles(
    projectPath,
    "src/**/*.{ts,tsx,js,jsx}"
  );

  const changedFiles: string[] = [];

  for (const filePath of sourceFiles) {
    const original = await readFile(filePath, "utf-8");
    let content = original;

    // Replace Lovable integration imports with Supabase client import
    content = content.replace(
      /import\s*\{[^}]*\}\s*from\s*['"]@\/integrations\/lovable['"]/g,
      "import { supabase } from '@/integrations/supabase/client'"
    );

    // Replace @lovable.dev/cloud-auth-js imports
    content = content.replace(
      /import\s*\{[^}]*\}\s*from\s*['"]@lovable\.dev\/cloud-auth-js['"]/g,
      "import { supabase } from '@/integrations/supabase/client'"
    );

    // Replace lovable.auth.signInWithOAuth(provider, { redirect_uri: ... })
    // → supabase.auth.signInWithOAuth({ provider, options: { redirectTo: ... } })
    content = content.replace(
      /lovable\.auth\.signInWithOAuth\(\s*(\w+)\s*,\s*\{\s*redirect_uri\s*:\s*([^}]+)\}\s*\)/g,
      "supabase.auth.signInWithOAuth({ provider: $1, options: { redirectTo: $2} })"
    );

    // Simpler form: lovable.auth.signInWithOAuth(provider)
    // → supabase.auth.signInWithOAuth({ provider })
    content = content.replace(
      /lovable\.auth\.signInWithOAuth\(\s*(\w+)\s*\)/g,
      "supabase.auth.signInWithOAuth({ provider: $1 })"
    );

    // Replace any remaining lovable.auth.X calls with supabase.auth.X
    content = content.replace(/lovable\.auth\./g, "supabase.auth.");

    // Remove duplicate supabase imports if one already existed
    const supabaseImportPattern =
      /import\s*\{\s*supabase\s*\}\s*from\s*['"]@\/integrations\/supabase\/client['"]/g;
    const matches = content.match(supabaseImportPattern);
    if (matches && matches.length > 1) {
      // Keep only the first occurrence
      let count = 0;
      content = content.replace(supabaseImportPattern, (match) => {
        count++;
        return count === 1 ? match : "";
      });
      // Clean up blank lines from removed imports
      content = content.replace(/\n{3,}/g, "\n\n");
    }

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
      description: "No Lovable OAuth calls found",
      files: [],
    };
  }

  return {
    changed: true,
    description: `Replaced OAuth calls in ${changedFiles.length} file(s)`,
    files: changedFiles,
  };
}
