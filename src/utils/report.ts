import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import type { AnalysisResult } from "../types.js";

/**
 * Generate a standalone HTML report from analysis results.
 * Opens in the user's browser for a visual overview.
 */
export function generateReportHtml(result: AnalysisResult): string {
  const riskColors = {
    simple: { bg: "#065f46", text: "#d1fae5", label: "SIMPLE" },
    moderate: { bg: "#92400e", text: "#fef3c7", label: "MODERATE" },
    complex: { bg: "#991b1b", text: "#fee2e2", label: "COMPLEX" },
  };
  const risk = riskColors[result.risk.level];

  // Group references by type
  const refGroups = new Map<string, typeof result.lovableFiles>();
  for (const ref of result.lovableFiles) {
    const group = refGroups.get(ref.referenceType) ?? [];
    group.push(ref);
    refGroups.set(ref.referenceType, group);
  }

  // Group migration issues by type
  const migrationGroups = new Map<string, typeof result.migrations.issues>();
  for (const issue of result.migrations.issues) {
    const group = migrationGroups.get(issue.type) ?? [];
    group.push(issue);
    migrationGroups.set(issue.type, group);
  }

  const refGroupsHtml = Array.from(refGroups.entries())
    .map(([type, refs]) => {
      const uniqueFiles = [...new Set(refs.map((r) => r.filePath))];
      const fileList = uniqueFiles
        .map((f) => {
          const shortPath = f.replace(result.projectPath + "/", "");
          const lines = refs
            .filter((r) => r.filePath === f)
            .map((r) => r.line)
            .join(", ");
          return `<div class="file-entry"><code>${shortPath}</code><span class="lines">line${refs.filter((r) => r.filePath === f).length > 1 ? "s" : ""} ${lines}</span></div>`;
        })
        .join("");
      return `
        <div class="ref-group">
          <div class="ref-type">${type} <span class="ref-count">${refs.length}</span></div>
          ${fileList}
        </div>`;
    })
    .join("");

  const migrationHtml =
    result.migrations.issues.length === 0
      ? '<p class="success-text">No migration issues found</p>'
      : Array.from(migrationGroups.entries())
          .map(([type, issues]) => {
            return `
            <div class="migration-group">
              <div class="migration-type">${issues[0].description} <span class="ref-count">${issues.length}</span></div>
              <div class="migration-fix">Fix: ${issues[0].fix}</div>
            </div>`;
          })
          .join("");

  const schemaItems = [
    { label: "Tables", count: result.supabaseSchema.tables.length, items: result.supabaseSchema.tables },
    { label: "Views", count: result.supabaseSchema.views.length, items: result.supabaseSchema.views },
    { label: "Functions", count: result.supabaseSchema.functions.length, items: result.supabaseSchema.functions },
    { label: "Enums", count: result.supabaseSchema.enums.length, items: result.supabaseSchema.enums },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>lovable-eject — Migration Analysis</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Outfit:wght@300;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0b;
      --surface: #141416;
      --surface-2: #1c1c20;
      --border: #2a2a30;
      --text: #e4e4e7;
      --text-dim: #71717a;
      --accent: #22d3ee;
      --accent-dim: rgba(34, 211, 238, 0.1);
      --warn: #f59e0b;
      --warn-dim: rgba(245, 158, 11, 0.1);
      --danger: #ef4444;
      --success: #10b981;
      --success-dim: rgba(16, 185, 129, 0.1);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 960px; margin: 0 auto; }
    
    /* Header */
    .header {
      display: flex;
      align-items: baseline;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }
    .header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, var(--accent), #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .header .version {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text-dim);
    }
    .project-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      color: var(--text-dim);
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }
    
    /* Risk banner */
    .risk-banner {
      background: ${risk.bg};
      color: ${risk.text};
      padding: 1.25rem 1.5rem;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .risk-banner .risk-label {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .risk-banner .risk-score {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      opacity: 0.8;
    }
    .risk-reasons {
      margin-top: 0.75rem;
      font-size: 0.85rem;
      opacity: 0.9;
      line-height: 1.6;
    }
    
    /* Stats grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
      text-align: center;
    }
    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent);
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 0.25rem;
    }
    
    /* Section */
    .section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .section h2 {
      font-size: 1rem;
      font-weight: 500;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
    }
    
    /* Dependencies */
    .dep-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid var(--border);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
    }
    .dep-item:last-child { border-bottom: none; }
    .dep-badge {
      font-size: 0.65rem;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      background: var(--warn-dim);
      color: var(--warn);
      font-weight: 600;
    }
    
    /* References */
    .ref-group { margin-bottom: 1rem; }
    .ref-group:last-child { margin-bottom: 0; }
    .ref-type {
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .ref-count {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      background: var(--accent-dim);
      color: var(--accent);
    }
    .file-entry {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.35rem 0 0.35rem 1rem;
      font-size: 0.8rem;
    }
    .file-entry code {
      color: var(--text-dim);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
    }
    .lines {
      color: var(--text-dim);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
    }
    
    /* Migrations */
    .migration-group { margin-bottom: 0.75rem; }
    .migration-type {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--warn);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .migration-fix {
      font-size: 0.8rem;
      color: var(--text-dim);
      margin-top: 0.25rem;
      padding-left: 1rem;
    }

    /* Schema */
    .schema-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }
    .schema-item {
      background: var(--surface-2);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .schema-count {
      font-size: 1.5rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      color: var(--text);
    }
    .schema-label {
      font-size: 0.75rem;
      color: var(--text-dim);
      margin-top: 0.25rem;
    }
    
    /* Capacitor */
    .cap-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.85rem;
    }
    .cap-row:last-child { border-bottom: none; }
    .cap-label { color: var(--text-dim); }
    .cap-value { font-family: 'JetBrains Mono', monospace; }
    .cap-warn {
      color: var(--warn);
      font-size: 0.8rem;
      margin-top: 0.5rem;
    }
    
    .success-text { color: var(--success); }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 2rem 0 1rem;
      color: var(--text-dim);
      font-size: 0.75rem;
    }
    .footer a { color: var(--accent); text-decoration: none; }

    @media (max-width: 640px) {
      .stats-grid, .schema-grid { grid-template-columns: repeat(2, 1fr); }
      body { padding: 1rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>lovable-eject</h1>
      <span class="version">v0.1.0</span>
    </div>
    <div class="project-path">${result.projectPath}</div>
    
    <!-- Risk Banner -->
    <div class="risk-banner">
      <div>
        <div class="risk-label">${risk.label}</div>
        <div class="risk-reasons">${result.risk.reasons.map((r) => `• ${r}`).join("<br>")}</div>
      </div>
      <div class="risk-score">Score: ${result.risk.score}</div>
    </div>
    
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${result.lovableDeps.length}</div>
        <div class="stat-label">Dependencies</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${result.lovableFiles.length}</div>
        <div class="stat-label">References</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${result.migrations.issues.length}</div>
        <div class="stat-label">SQL Issues</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${result.migrations.fileCount}</div>
        <div class="stat-label">Migrations</div>
      </div>
    </div>
    
    <!-- Dependencies -->
    <div class="section">
      <h2>Dependencies to Remove</h2>
      ${
        result.lovableDeps.length === 0
          ? '<p class="success-text">No Lovable dependencies found</p>'
          : result.lovableDeps
              .map(
                (dep) =>
                  `<div class="dep-item"><span>${dep.name}@${dep.version}</span><span class="dep-badge">${dep.type}</span></div>`
              )
              .join("")
      }
    </div>
    
    <!-- References -->
    <div class="section">
      <h2>Code References</h2>
      ${result.lovableFiles.length === 0 ? '<p class="success-text">No Lovable references found</p>' : refGroupsHtml}
    </div>
    
    <!-- Migrations -->
    <div class="section">
      <h2>Migration Issues</h2>
      ${migrationHtml}
    </div>
    
    <!-- Schema -->
    <div class="section">
      <h2>Supabase Schema</h2>
      <div class="schema-grid">
        ${schemaItems.map((s) => `<div class="schema-item"><div class="schema-count">${s.count}</div><div class="schema-label">${s.label}</div></div>`).join("")}
      </div>
    </div>
    
    <!-- Capacitor -->
    ${
      result.capacitor
        ? `<div class="section">
      <h2>Capacitor (Mobile)</h2>
      <div class="cap-row"><span class="cap-label">App ID</span><span class="cap-value">${result.capacitor.appId}</span></div>
      <div class="cap-row"><span class="cap-label">App Name</span><span class="cap-value">${result.capacitor.appName}</span></div>
      ${result.capacitor.hasLovableDeepLinks ? '<div class="cap-warn">⚠ Deep links use Lovable scheme — will need updating</div>' : ""}
    </div>`
        : ""
    }
    
    <div class="footer">
      Generated by <a href="https://github.com/lovable-eject">lovable-eject</a> • ${new Date().toLocaleDateString()}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Write the HTML report to disk and return the file path.
 */
export async function writeReport(
  projectPath: string,
  result: AnalysisResult
): Promise<string> {
  const html = generateReportHtml(result);
  const reportPath = join(projectPath, "lovable-eject-report.html");
  await writeFile(reportPath, html, "utf-8");
  return reportPath;
}
