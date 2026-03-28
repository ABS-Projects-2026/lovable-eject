import { grepFiles } from "../utils/files.js";
import type { LovableFileReference } from "../types.js";

interface PatternDef {
  pattern: RegExp;
  type: LovableFileReference["referenceType"];
}

const LOVABLE_PATTERNS: PatternDef[] = [
  {
    pattern: /from\s+['"]@lovable\.dev\//,
    type: "import",
  },
  {
    pattern: /from\s+['"]@\/integrations\/lovable/,
    type: "import",
  },
  {
    pattern: /require\s*\(\s*['"]@lovable\.dev\//,
    type: "import",
  },
  {
    pattern: /lovable\.auth\.signInWithOAuth/,
    type: "oauth-call",
  },
  {
    pattern: /app\.lovable\.[a-f0-9-]+/i,
    type: "deep-link",
  },
  {
    pattern: /lovable\.dev\/opengraph-image/,
    type: "og-image",
  },
  {
    pattern: /lovable\.dev\/og-image/,
    type: "og-image",
  },
  {
    pattern: /\.lovable\.app/,
    type: "domain",
  },
  {
    pattern: /lovable-tagger/,
    type: "tagger",
  },
];

/** File glob that includes HTML for OG/meta detection */
const SCAN_GLOB = "**/*.{ts,tsx,js,jsx,json,html}";

/**
 * Scan source files for Lovable-specific references.
 */
export async function analyseLovableReferences(
  projectPath: string
): Promise<LovableFileReference[]> {
  const results: LovableFileReference[] = [];

  for (const { pattern, type } of LOVABLE_PATTERNS) {
    const matches = await grepFiles(projectPath, pattern, SCAN_GLOB);
    for (const match of matches) {
      results.push({
        filePath: match.filePath,
        referenceType: type,
        line: match.line,
        content: match.content,
      });
    }
  }

  // Deduplicate by file + line
  const seen = new Set<string>();
  return results.filter((ref) => {
    const key = `${ref.filePath}:${ref.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
