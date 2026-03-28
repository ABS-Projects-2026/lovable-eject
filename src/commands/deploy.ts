import { join } from "node:path";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import inquirer from "inquirer";
import { log, spinner } from "../utils/logger.js";
import { resolveProjectPath, findFiles, fileExists } from "../utils/files.js";

const execAsync = promisify(execCb);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeployStepResult {
  name: string;
  status: "completed" | "skipped" | "failed";
  description: string;
}

export interface HealthCheckResult {
  ok: boolean;
  status?: number;
  body?: unknown;
  error?: string;
}

export interface EnvVar {
  key: string;
  value: string;
  description: string;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

export type ExecFn = (
  command: string,
  options: { cwd: string }
) => Promise<{ stdout: string; stderr: string }>;

export type FetchFn = (
  url: string,
  init?: RequestInit
) => Promise<Response>;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a Supabase project ref (alphanumeric lowercase, no injection risk).
 */
export function isValidSupabaseRef(ref: string): boolean {
  return /^[a-z0-9]+$/.test(ref) && ref.length >= 1 && ref.length <= 40;
}

// ---------------------------------------------------------------------------
// Step 1: Supabase link + db push
// ---------------------------------------------------------------------------

export async function runSupabaseCommands(
  projectPath: string,
  projectRef: string,
  execFn: ExecFn = execAsync
): Promise<{
  linkOk: boolean;
  pushOk: boolean;
  linkOutput: string;
  pushOutput: string;
}> {
  if (!isValidSupabaseRef(projectRef)) {
    return {
      linkOk: false,
      pushOk: false,
      linkOutput: `Invalid project ref: "${projectRef}". Must be lowercase alphanumeric.`,
      pushOutput: "",
    };
  }

  let linkOutput = "";
  let pushOutput = "";
  let linkOk = false;
  let pushOk = false;

  try {
    const linkResult = await execFn(
      `supabase link --project-ref ${projectRef}`,
      { cwd: projectPath }
    );
    linkOutput = (linkResult.stdout + linkResult.stderr).trim();
    linkOk = true;
  } catch (error) {
    linkOutput = error instanceof Error ? error.message : String(error);
  }

  if (linkOk) {
    try {
      const pushResult = await execFn("supabase db push", {
        cwd: projectPath,
      });
      pushOutput = (pushResult.stdout + pushResult.stderr).trim();
      pushOk = true;
    } catch (error) {
      pushOutput = error instanceof Error ? error.message : String(error);
    }
  }

  return { linkOk, pushOk, linkOutput, pushOutput };
}

// ---------------------------------------------------------------------------
// Step 2: Env vars list
// ---------------------------------------------------------------------------

/**
 * Build the list of env vars needed for Vercel deployment.
 */
export function buildEnvVarsList(projectRef: string): EnvVar[] {
  return [
    {
      key: "VITE_SUPABASE_URL",
      value: `https://${projectRef}.supabase.co`,
      description: "Your Supabase project URL",
    },
    {
      key: "VITE_SUPABASE_ANON_KEY",
      value: "<your-anon-key-from-supabase-dashboard>",
      description: "Supabase anon/public key (Project Settings > API)",
    },
  ];
}

// ---------------------------------------------------------------------------
// Step 3: Custom domain detection + DNS
// ---------------------------------------------------------------------------

/**
 * Detect custom domain references in project source files.
 * Returns the first domain placeholder or reference found.
 */
export async function detectCustomDomain(
  projectPath: string
): Promise<string | null> {
  // Check .env.example first for VITE_APP_URL
  const envExample = join(projectPath, ".env.example");
  if (await fileExists(envExample)) {
    const content = await readFile(envExample, "utf-8");
    const match = content.match(/VITE_APP_URL\s*=\s*https?:\/\/(.+)/);
    if (match) return match[1].trim();
  }

  // Scan source files for YOUR_DOMAIN.com placeholder (from our transform step)
  const files = await findFiles(projectPath, "src/**/*.{ts,tsx,js,jsx}");
  for (const filePath of files) {
    const content = await readFile(filePath, "utf-8");
    if (content.includes("YOUR_DOMAIN.com")) {
      return "YOUR_DOMAIN.com";
    }
  }

  return null;
}

/**
 * Get DNS records needed for a custom domain on Vercel.
 */
export function getDnsInstructions(domain: string): DnsRecord[] {
  return [
    { type: "CNAME", name: "@", value: "cname.vercel-dns.com" },
    { type: "CNAME", name: "www", value: "cname.vercel-dns.com" },
  ];
}

// ---------------------------------------------------------------------------
// Step 4: Health check
// ---------------------------------------------------------------------------

/**
 * Run a health check against the deployed api/health.js endpoint.
 */
export async function runHealthCheck(
  url: string,
  fetchFn: FetchFn = globalThis.fetch
): Promise<HealthCheckResult> {
  try {
    const healthUrl = url.replace(/\/$/, "") + "/api/health";
    const response = await fetchFn(healthUrl, {
      signal: AbortSignal.timeout(10_000),
    });
    const body = await response.json();
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Step 5: UptimeRobot instructions
// ---------------------------------------------------------------------------

/**
 * Get UptimeRobot monitoring setup instructions.
 */
export function getUptimeRobotInstructions(healthUrl: string): string[] {
  return [
    "1. Create a free account at https://uptimerobot.com",
    "2. Add a new monitor:",
    "   - Monitor Type: HTTP(s)",
    `   - URL: ${healthUrl}`,
    "   - Monitoring Interval: 5 minutes",
    "3. Set up alert contacts (email, Slack, etc.)",
    "4. This keeps your Vercel functions warm and alerts you to downtime",
  ];
}

// ---------------------------------------------------------------------------
// Interactive deploy command
// ---------------------------------------------------------------------------

export async function deployCommand(path: string): Promise<void> {
  try {
    const projectPath = await resolveProjectPath(path);
    const steps: DeployStepResult[] = [];
    let projectRef = "";
    let deployedUrl = "";

    log.heading("Deploy Guide — Vercel + Supabase");

    // ------------------------------------------------------------------
    // Step 1: Supabase Database Setup
    // ------------------------------------------------------------------
    log.heading("Step 1: Supabase Database Setup");

    const { skipSupabase } = await inquirer.prompt([
      {
        type: "confirm",
        name: "skipSupabase",
        message: "Have you already run supabase link and db push?",
        default: false,
      },
    ]);

    if (skipSupabase) {
      steps.push({
        name: "Supabase setup",
        status: "skipped",
        description: "Already linked",
      });

      // Still ask for ref so we can build env vars
      const { ref } = await inquirer.prompt([
        {
          type: "input",
          name: "ref",
          message:
            "Enter your Supabase project ref (for env var setup):",
          validate: (input: string) =>
            isValidSupabaseRef(input) ||
            "Must be lowercase alphanumeric (find it in your Supabase dashboard URL)",
        },
      ]);
      projectRef = ref;
    } else {
      const { ref } = await inquirer.prompt([
        {
          type: "input",
          name: "ref",
          message:
            "Enter your Supabase project ref (from dashboard URL):",
          validate: (input: string) =>
            isValidSupabaseRef(input) ||
            "Must be lowercase alphanumeric (find it in your Supabase dashboard URL)",
        },
      ]);
      projectRef = ref;

      const spin = spinner("Running supabase link + db push...");
      const result = await runSupabaseCommands(projectPath, projectRef);

      if (result.linkOk && result.pushOk) {
        spin.succeed("Supabase linked and migrations pushed");
        steps.push({
          name: "Supabase setup",
          status: "completed",
          description: "Linked and pushed migrations",
        });
      } else if (result.linkOk) {
        spin.warn("Supabase linked but db push failed");
        log.error(result.pushOutput);
        log.info("You can retry manually: supabase db push");
        steps.push({
          name: "Supabase setup",
          status: "failed",
          description: `Link OK, push failed: ${result.pushOutput}`,
        });
      } else {
        spin.fail("Supabase link failed");
        log.error(result.linkOutput);
        log.info(
          "Make sure the Supabase CLI is installed: npm i -g supabase"
        );
        steps.push({
          name: "Supabase setup",
          status: "failed",
          description: result.linkOutput,
        });
      }
    }

    // ------------------------------------------------------------------
    // Step 2: Vercel Environment Variables
    // ------------------------------------------------------------------
    log.heading("Step 2: Vercel Environment Variables");

    const envVars = buildEnvVarsList(projectRef);
    log.info(
      "Add these environment variables in your Vercel project settings:\n"
    );
    for (const v of envVars) {
      log.table(v.key, v.value);
      log.dim(`  ${v.description}`);
    }

    const { envDone } = await inquirer.prompt([
      {
        type: "confirm",
        name: "envDone",
        message: "Have you added the environment variables in Vercel?",
        default: false,
      },
    ]);

    steps.push({
      name: "Vercel env vars",
      status: envDone ? "completed" : "skipped",
      description: envDone
        ? "Environment variables configured"
        : "User will configure later",
    });

    // ------------------------------------------------------------------
    // Step 3: Custom Domain & DNS
    // ------------------------------------------------------------------
    log.heading("Step 3: Custom Domain & DNS");

    const detectedDomain = await detectCustomDomain(projectPath);
    if (detectedDomain) {
      log.info(`Detected domain reference: ${detectedDomain}`);
    }

    const { customDomain } = await inquirer.prompt([
      {
        type: "input",
        name: "customDomain",
        message:
          "Enter your custom domain (or press Enter to skip):",
        default: "",
      },
    ]);

    if (customDomain) {
      const records = getDnsInstructions(customDomain);
      log.info(`\nAdd these DNS records for ${customDomain}:\n`);
      log.dim("  Type      Name    Value");
      log.dim("  ────      ────    ─────");
      for (const r of records) {
        log.table(`  ${r.type.padEnd(8)}  ${r.name.padEnd(6)}`, r.value);
      }
      log.info(
        "\nThen add the domain in your Vercel project settings > Domains."
      );
      steps.push({
        name: "DNS setup",
        status: "completed",
        description: `Instructions shown for ${customDomain}`,
      });
    } else {
      log.dim(
        "Skipped — you can add a custom domain later in Vercel settings."
      );
      steps.push({
        name: "DNS setup",
        status: "skipped",
        description: "No custom domain provided",
      });
    }

    // ------------------------------------------------------------------
    // Step 4: Health Check
    // ------------------------------------------------------------------
    log.heading("Step 4: Health Check");

    const { skipHealth } = await inquirer.prompt([
      {
        type: "confirm",
        name: "skipHealth",
        message: "Is your app deployed and ready for a health check?",
        default: false,
      },
    ]);

    if (skipHealth) {
      const { url } = await inquirer.prompt([
        {
          type: "input",
          name: "url",
          message:
            "Enter your deployed URL (e.g. https://your-app.vercel.app):",
          validate: (input: string) =>
            input.startsWith("http") || "Must be a valid URL starting with http",
        },
      ]);
      deployedUrl = url;

      const spin = spinner("Running health check...");
      const healthResult = await runHealthCheck(deployedUrl);

      if (healthResult.ok) {
        spin.succeed(
          `Health check passed (status ${healthResult.status})`
        );
        steps.push({
          name: "Health check",
          status: "completed",
          description: `OK — status ${healthResult.status}`,
        });
      } else {
        spin.fail("Health check failed");
        if (healthResult.error) {
          log.error(healthResult.error);
        } else {
          log.error(`Status ${healthResult.status}`);
        }
        log.info(
          "Make sure your app is deployed and api/health.js exists."
        );
        steps.push({
          name: "Health check",
          status: "failed",
          description: healthResult.error ?? `Status ${healthResult.status}`,
        });
      }
    } else {
      log.dim("Skipped — deploy your app first, then re-run this step.");
      steps.push({
        name: "Health check",
        status: "skipped",
        description: "App not yet deployed",
      });
    }

    // ------------------------------------------------------------------
    // Step 5: UptimeRobot Monitoring
    // ------------------------------------------------------------------
    log.heading("Step 5: UptimeRobot Monitoring");

    const healthUrl = deployedUrl
      ? deployedUrl.replace(/\/$/, "") + "/api/health"
      : "https://your-app.vercel.app/api/health";

    const instructions = getUptimeRobotInstructions(healthUrl);
    log.info("Set up free monitoring to prevent cold starts:\n");
    for (const line of instructions) {
      log.dim(`  ${line}`);
    }

    steps.push({
      name: "UptimeRobot setup",
      status: "completed",
      description: "Instructions displayed",
    });

    // ------------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------------
    log.heading("Summary");

    const completed = steps.filter((s) => s.status === "completed");
    const skipped = steps.filter((s) => s.status === "skipped");
    const failed = steps.filter((s) => s.status === "failed");

    if (completed.length > 0) {
      log.success(`${completed.length} step(s) completed`);
    }
    if (skipped.length > 0) {
      log.dim(
        `${skipped.length} step(s) skipped — re-run 'npx lovable-eject deploy ${path}' to finish`
      );
    }
    if (failed.length > 0) {
      log.warn(
        `${failed.length} step(s) failed — check the errors above and retry`
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Deploy guide failed: ${message}`);
    process.exit(1);
  }
}
