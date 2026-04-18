import { log, spinner } from "../utils/logger.js";
import { resolveProjectPath } from "../utils/files.js";
import { analyseDependencies } from "../analysers/dependencies.js";
import { analyseLovableReferences } from "../analysers/references.js";
import { analyseMigrations } from "../analysers/migrations.js";
import { analyseSupabaseSchema } from "../analysers/supabase-schema.js";
import { analyseCapacitor } from "../analysers/capacitor.js";
import { assessRisk } from "../analysers/risk.js";
import { writeReport } from "../utils/report.js";
import type { AnalysisResult } from "../types.js";
import { execFile } from "node:child_process";

interface AnalyseOptions {
  json?: boolean;
  report?: boolean;
}

export async function analyseCommand(
  path: string,
  options: AnalyseOptions
): Promise<void> {
  try {
    const projectPath = await resolveProjectPath(path);
    const spin = spinner("Analysing Lovable project...");

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

    spin.succeed("Analysis complete");

    const result: AnalysisResult = {
      projectPath,
      lovableDeps,
      lovableFiles,
      migrations,
      supabaseSchema,
      capacitor,
      risk,
    };

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    printReport(result);

    if (options.report) {
      const reportPath = await writeReport(projectPath, result);
      log.success(`Report saved to ${reportPath}`);
      // Open in default browser
      const openCmd =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "start"
            : "xdg-open";
      execFile(openCmd, [reportPath]);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`Analysis failed: ${message}`);
    process.exit(1);
  }
}

function printReport(result: AnalysisResult): void {
  log.heading("Lovable Migration Analysis");

  // Dependencies
  log.heading("Dependencies");
  if (result.lovableDeps.length === 0) {
    log.success("No Lovable-specific dependencies found");
  } else {
    for (const dep of result.lovableDeps) {
      log.warn(`${dep.name}@${dep.version} (${dep.type})`);
    }
  }

  // File references — grouped by type
  log.heading("Lovable References in Code");
  if (result.lovableFiles.length === 0) {
    log.success("No Lovable-specific references found");
  } else {
    const grouped = new Map<string, typeof result.lovableFiles>();
    for (const ref of result.lovableFiles) {
      const group = grouped.get(ref.referenceType) ?? [];
      group.push(ref);
      grouped.set(ref.referenceType, group);
    }

    for (const [type, refs] of grouped) {
      // Show unique files only (not every line in the same file)
      const uniqueFiles = [...new Set(refs.map((r) => r.filePath))];
      log.warn(`${type} (${refs.length} reference${refs.length > 1 ? "s" : ""} in ${uniqueFiles.length} file${uniqueFiles.length > 1 ? "s" : ""}):`);
      for (const file of uniqueFiles) {
        const fileRefs = refs.filter((r) => r.filePath === file);
        const lines = fileRefs.map((r) => r.line).join(", ");
        log.dim(`  ${file} (line${fileRefs.length > 1 ? "s" : ""} ${lines})`);
      }
    }
  }

  // Migrations — grouped by issue type
  log.heading("SQL Migrations");
  log.table("Migration files", result.migrations.fileCount);
  if (result.migrations.issues.length === 0) {
    log.success("No migration issues found");
  } else {
    const grouped = new Map<string, typeof result.migrations.issues>();
    for (const issue of result.migrations.issues) {
      const group = grouped.get(issue.type) ?? [];
      group.push(issue);
      grouped.set(issue.type, group);
    }

    for (const [type, issues] of grouped) {
      const uniqueFiles = [...new Set(issues.map((i) => i.filePath))];
      log.warn(`${issues[0].description} — ${issues.length} occurrence${issues.length > 1 ? "s" : ""} across ${uniqueFiles.length} file${uniqueFiles.length > 1 ? "s" : ""}:`);
      for (const file of uniqueFiles) {
        const fileIssues = issues.filter((i) => i.filePath === file);
        const lines = fileIssues.map((i) => i.line).join(", ");
        log.dim(`  ${file} (line${fileIssues.length > 1 ? "s" : ""} ${lines})`);
      }
    }
    log.info(`Fix: ${result.migrations.issues[0].fix}`);
  }

  // Supabase schema
  log.heading("Supabase Schema");
  log.table("Tables", result.supabaseSchema.tables.length);
  log.table("Views", result.supabaseSchema.views.length);
  log.table("Functions", result.supabaseSchema.functions.length);
  log.table("Enums", result.supabaseSchema.enums.length);

  // Capacitor
  if (result.capacitor) {
    log.heading("Capacitor (Mobile)");
    log.table("App ID", result.capacitor.appId);
    log.table("App Name", result.capacitor.appName);
    if (result.capacitor.hasLovableDeepLinks) {
      log.warn("Deep links use Lovable scheme — will need updating");
    }
  }

  // Risk assessment
  log.heading("Risk Assessment");
  log.table("Migration complexity", `${result.risk.level.toUpperCase()} (score: ${result.risk.score})`);
  for (const reason of result.risk.reasons) {
    log.dim(`  • ${reason}`);
  }
}
