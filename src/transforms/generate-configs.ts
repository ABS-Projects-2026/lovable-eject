import { join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { fileExists } from "../utils/files.js";
import type { TransformResult } from "./remove-deps.js";

/**
 * Create .env.example with required Supabase variables.
 */
export async function createEnvExample(
  projectPath: string,
  dryRun: boolean
): Promise<TransformResult> {
  const envPath = join(projectPath, ".env.example");

  if (await fileExists(envPath)) {
    return {
      changed: false,
      description: ".env.example already exists",
      files: [],
    };
  }

  const content = `# Supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Custom domain
# VITE_APP_URL=https://your-domain.com
`;

  if (!dryRun) {
    await writeFile(envPath, content, "utf-8");
  }

  return {
    changed: true,
    description: "Created .env.example with Supabase variables",
    files: [".env.example"],
  };
}

/**
 * Create vercel.json with SPA rewrite rules.
 */
export async function createVercelConfig(
  projectPath: string,
  dryRun: boolean
): Promise<TransformResult> {
  const vercelPath = join(projectPath, "vercel.json");

  if (await fileExists(vercelPath)) {
    return {
      changed: false,
      description: "vercel.json already exists",
      files: [],
    };
  }

  const config = {
    rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    headers: [
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ],
  };

  if (!dryRun) {
    await writeFile(vercelPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
  }

  return {
    changed: true,
    description: "Created vercel.json with SPA rewrites",
    files: ["vercel.json"],
  };
}

/**
 * Create api/health.js endpoint for keep-alive monitoring.
 */
export async function createHealthEndpoint(
  projectPath: string,
  dryRun: boolean
): Promise<TransformResult> {
  const apiDir = join(projectPath, "api");
  const healthPath = join(apiDir, "health.js");

  if (await fileExists(healthPath)) {
    return {
      changed: false,
      description: "api/health.js already exists",
      files: [],
    };
  }

  const content = `export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
`;

  if (!dryRun) {
    await mkdir(apiDir, { recursive: true });
    await writeFile(healthPath, content, "utf-8");
  }

  return {
    changed: true,
    description: "Created api/health.js keep-alive endpoint",
    files: ["api/health.js"],
  };
}
