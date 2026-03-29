#!/usr/bin/env node

import { Command } from "commander";
import { analyseCommand } from "./commands/analyse.js";
import { transformCommand } from "./commands/transform.js";
import { deployCommand } from "./commands/deploy.js";
import { restoreCommand } from "./commands/restore.js";

const program = new Command();

program
  .name("lovable-eject")
  .description(
    "Migrate Lovable.dev projects to free-tier hosting (Vercel + Supabase)"
  )
  .version("0.1.0");

program
  .command("analyse")
  .alias("analyze")
  .description("Analyse a Lovable project for migration readiness")
  .argument("<path>", "Path to the Lovable project")
  .option("--json", "Output results as JSON")
  .option("--report", "Generate an HTML report and open in browser")
  .action(analyseCommand);

program
  .command("transform")
  .description("Transform code to remove Lovable dependencies")
  .argument("<path>", "Path to the Lovable project")
  .option("--dry-run", "Show what would change without modifying files")
  .option("--no-backup", "Skip creating backup files")
  .action(transformCommand);

program
  .command("deploy")
  .description("Interactive deployment guide for Vercel + Supabase")
  .argument("<path>", "Path to the Lovable project")
  .action(deployCommand);

program
  .command("restore")
  .description("Restore original files from .bak backups (undo a transform)")
  .argument("<path>", "Path to the project")
  .option("--dry-run", "Show what would be restored without doing it")
  .action(restoreCommand);

program.parse();
