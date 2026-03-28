import express from "express";
import cors from "cors";
import { resolve } from "node:path";
import { access } from "node:fs/promises";
import { analyseDependencies } from "../src/analysers/dependencies.js";
import { analyseLovableReferences } from "../src/analysers/references.js";
import { analyseMigrations } from "../src/analysers/migrations.js";
import { analyseSupabaseSchema } from "../src/analysers/supabase-schema.js";
import { analyseCapacitor } from "../src/analysers/capacitor.js";
import { assessRisk } from "../src/analysers/risk.js";
import { removeLovableDeps } from "../src/transforms/remove-deps.js";
import { deleteLovableIntegration } from "../src/transforms/delete-lovable-dir.js";
import { replaceOAuthCalls } from "../src/transforms/replace-oauth.js";
import { fixMigrations } from "../src/transforms/fix-migrations.js";
import { removeTagger } from "../src/transforms/remove-tagger.js";
import { cleanLovableReferences } from "../src/transforms/clean-references.js";
import { updateCapacitorConfig } from "../src/transforms/update-capacitor.js";
import {
  createEnvExample,
  createVercelConfig,
  createHealthEndpoint,
} from "../src/transforms/generate-configs.js";
import {
  isValidSupabaseRef,
  detectCustomDomain,
  buildEnvVarsList,
  runHealthCheck,
  getDnsInstructions,
  getUptimeRobotInstructions,
} from "../src/commands/deploy.js";

const app = express();
const PORT = 5174;

app.use(cors());
app.use(express.json());

// POST /api/analyse — run analysis on a project path
app.post("/api/analyse", async (req, res) => {
  try {
    const { path: inputPath } = req.body;
    if (!inputPath) {
      return res.status(400).json({ error: "Path is required" });
    }

    const projectPath = resolve(inputPath);
    await access(projectPath);

    const [lovableDeps, lovableFiles, migrations, supabaseSchema, capacitor] =
      await Promise.all([
        analyseDependencies(projectPath),
        analyseLovableReferences(projectPath),
        analyseMigrations(projectPath),
        analyseSupabaseSchema(projectPath),
        analyseCapacitor(projectPath),
      ]);

    const risk = assessRisk({
      lovableDeps,
      lovableFiles,
      migrations,
      supabaseSchema,
      capacitor,
    });

    res.json({
      projectPath,
      lovableDeps,
      lovableFiles,
      migrations,
      supabaseSchema,
      capacitor,
      risk,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

// POST /api/transform — run transforms with Server-Sent Events for progress
app.post("/api/transform", async (req, res) => {
  try {
    const { path: inputPath, dryRun = false } = req.body;
    if (!inputPath) {
      return res.status(400).json({ error: "Path is required" });
    }

    const projectPath = resolve(inputPath);
    await access(projectPath);

    // Set up SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendStep = (name: string, status: string, description: string) => {
      res.write(
        `data: ${JSON.stringify({ name, status, description })}\n\n`
      );
    };

    const steps = [
      {
        name: "Remove Lovable dependencies",
        run: () => removeLovableDeps(projectPath, dryRun, true),
      },
      {
        name: "Replace OAuth calls",
        run: () => replaceOAuthCalls(projectPath, dryRun, true),
      },
      {
        name: "Delete Lovable integration folder",
        run: () => deleteLovableIntegration(projectPath, dryRun, true),
      },
      {
        name: "Remove lovable-tagger from Vite config",
        run: () => removeTagger(projectPath, dryRun, true),
      },
      {
        name: "Fix SQL migrations",
        run: () => fixMigrations(projectPath, dryRun, true),
      },
      {
        name: "Clean Lovable domain & OG references",
        run: () => cleanLovableReferences(projectPath, dryRun, true),
      },
      {
        name: "Update Capacitor config",
        run: () => updateCapacitorConfig(projectPath, dryRun, true),
      },
      {
        name: "Create .env.example",
        run: () => createEnvExample(projectPath, dryRun),
      },
      {
        name: "Create vercel.json",
        run: () => createVercelConfig(projectPath, dryRun),
      },
      {
        name: "Create health endpoint",
        run: () => createHealthEndpoint(projectPath, dryRun),
      },
    ];

    for (const step of steps) {
      sendStep(step.name, "running", "");
      try {
        const result = await step.run();
        sendStep(
          step.name,
          result.changed ? "done" : "skipped",
          result.description
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        sendStep(step.name, "error", msg);
      }
    }

    res.write(`data: ${JSON.stringify({ name: "__complete__", status: "done", description: "" })}\n\n`);
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

// POST /api/deploy — non-interactive deploy guidance (detection + health check)
app.post("/api/deploy", async (req, res) => {
  try {
    const { path: inputPath, projectRef, deployedUrl } = req.body;
    if (!inputPath) {
      return res.status(400).json({ error: "Path is required" });
    }

    const projectPath = resolve(inputPath);
    await access(projectPath);

    const result: Record<string, unknown> = {};

    // Detect custom domain
    result.customDomain = await detectCustomDomain(projectPath);

    // Build env vars if project ref provided
    if (projectRef) {
      if (!isValidSupabaseRef(projectRef)) {
        return res
          .status(400)
          .json({ error: "Invalid projectRef: must be lowercase alphanumeric" });
      }
      result.envVars = buildEnvVarsList(projectRef);
    }

    // DNS instructions if custom domain detected
    if (result.customDomain && typeof result.customDomain === "string") {
      result.dnsInstructions = getDnsInstructions(result.customDomain);
    }

    // Health check if URL provided
    if (deployedUrl) {
      result.healthCheck = await runHealthCheck(deployedUrl);
    }

    // UptimeRobot instructions
    const healthUrl = deployedUrl
      ? String(deployedUrl).replace(/\/$/, "") + "/api/health"
      : "https://your-app.vercel.app/api/health";
    result.uptimeRobotInstructions = getUptimeRobotInstructions(healthUrl);

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`\n  lovable-eject API running at http://localhost:${PORT}\n`);
});
