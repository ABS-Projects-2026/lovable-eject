import { log, spinner } from "../utils/logger.js";
import { resolveProjectPath } from "../utils/files.js";
import { runVerification } from "../transforms/verify.js";
import { removeLovableDeps, type TransformResult } from "../transforms/remove-deps.js";
import { deleteLovableIntegration } from "../transforms/delete-lovable-dir.js";
import { replaceOAuthCalls } from "../transforms/replace-oauth.js";
import { fixMigrations } from "../transforms/fix-migrations.js";
import { removeTagger } from "../transforms/remove-tagger.js";
import { cleanLovableReferences } from "../transforms/clean-references.js";
import { updateCapacitorConfig } from "../transforms/update-capacitor.js";
import {
  createEnvExample,
  createVercelConfig,
  createHealthEndpoint,
} from "../transforms/generate-configs.js";

interface TransformOptions {
  dryRun?: boolean;
  backup?: boolean;
}

interface TransformStep {
  name: string;
  run: () => Promise<TransformResult>;
}

export async function transformCommand(
  path: string,
  options: TransformOptions
): Promise<void> {
  try {
    const projectPath = await resolveProjectPath(path);
    const dryRun = options.dryRun ?? false;
    const backup = options.backup !== false; // default true

    if (dryRun) {
      log.info("Dry run mode — no files will be modified\n");
    } else {
      log.warn("Make sure you've committed your code to git before proceeding. Backups will be created as .bak files.");
      if (backup) {
        log.info("Backup mode — original files saved as .bak\n");
      }
    }

    const steps: TransformStep[] = [
      {
        name: "Remove Lovable dependencies",
        run: () => removeLovableDeps(projectPath, dryRun, backup),
      },
      {
        name: "Replace OAuth calls",
        run: () => replaceOAuthCalls(projectPath, dryRun, backup),
      },
      {
        name: "Delete Lovable integration folder",
        run: () => deleteLovableIntegration(projectPath, dryRun, backup),
      },
      {
        name: "Remove lovable-tagger from Vite config",
        run: () => removeTagger(projectPath, dryRun, backup),
      },
      {
        name: "Fix SQL migrations",
        run: () => fixMigrations(projectPath, dryRun, backup),
      },
      {
        name: "Clean Lovable domain & OG references",
        run: () => cleanLovableReferences(projectPath, dryRun, backup),
      },
      {
        name: "Update Capacitor config",
        run: () => updateCapacitorConfig(projectPath, dryRun, backup),
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

    log.heading("Lovable Migration Transform");

    const results: Array<{ name: string; result: TransformResult }> = [];

    for (const step of steps) {
      const spin = spinner(step.name);
      try {
        const result = await step.run();
        results.push({ name: step.name, result });

        if (result.changed) {
          spin.succeed(`${step.name} — ${result.description}`);
        } else {
          spin.info(`${step.name} — ${result.description}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        spin.fail(`${step.name} — ${message}`);
        results.push({
          name: step.name,
          result: { changed: false, description: message, files: [] },
        });
      }
    }

    // Summary
    log.heading("Summary");
    const changed = results.filter((r) => r.result.changed);
    const skipped = results.filter((r) => !r.result.changed);

    if (changed.length > 0) {
      log.success(`${changed.length} transform(s) applied${dryRun ? " (dry run)" : ""}`);
      const allFiles = changed.flatMap((r) => r.result.files);
      log.table("Files affected", allFiles.length);
    } else {
      log.info("No transforms needed — project may already be migrated");
    }

    if (skipped.length > 0) {
      log.dim(`${skipped.length} step(s) skipped (already clean or not applicable)`);
    }

    // Post-transform verification (non-dry-run only)
    if (changed.length > 0 && !dryRun) {
      const inquirer = await import("inquirer");
      const { verify } = await inquirer.default.prompt([
        {
          type: "confirm",
          name: "verify",
          message: "Run npm install && npm run build to verify? (recommended)",
          default: true,
        },
      ]);

      if (verify) {
        log.heading("Verification");

        const installSpin = spinner("Running npm install...");
        const result = await runVerification(projectPath);
        installSpin.stop();

        if (result.install.success) {
          log.success("npm install succeeded");
        } else {
          log.error("npm install failed");
          log.dim(result.install.errors.join("\n"));
        }

        if (result.build) {
          if (result.build.success) {
            log.success("npm run build succeeded");
          } else {
            log.error("npm run build failed");
            log.dim(result.build.errors.join("\n"));
          }
        }
      }

      log.heading("Next Steps");
      log.info("1. Search for 'YOUR_DOMAIN' and 'com.yourapp.name' and replace with your values");
      log.info("2. Update your .env with real Supabase credentials from .env.example");
      log.info("3. Run 'npx lovable-eject deploy .' for deployment guidance");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Transform failed: ${message}`);
    process.exit(1);
  }
}
