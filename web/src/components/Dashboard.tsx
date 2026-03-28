import { useState } from "react";
import type { AnalysisResult } from "../App";
import { useViewMode } from "../context/ViewModeContext";
import CountUp from "./CountUp";
import HealthGrid from "./HealthGrid";

interface DashboardProps {
  analysis: AnalysisResult;
  onTransform: () => void;
  onReanalyse: () => void;
}

// ---------------------------------------------------------------------------
// Risk style config
// ---------------------------------------------------------------------------

const riskStyles = {
  simple: {
    bg: "bg-success/10",
    border: "border-success/20",
    text: "text-success",
    label: "SIMPLE",
    guideLabel:
      "You\u2019re in good shape \u2014 almost nothing to change.",
  },
  moderate: {
    bg: "bg-warn/10",
    border: "border-warn/20",
    text: "text-warn",
    label: "MODERATE",
    guideLabel:
      "A few things to fix, but nothing complicated.",
  },
  complex: {
    bg: "bg-danger/10",
    border: "border-danger/20",
    text: "text-danger",
    label: "COMPLEX",
    guideLabel:
      "This project has some tricky parts \u2014 we\u2019ll walk you through each one.",
  },
};

// ---------------------------------------------------------------------------
// Guide-mode copy helpers
// ---------------------------------------------------------------------------

const DEV_MIGRATION_COPY: Record<string, (n: number) => string> = {
  "missing-if-not-exists": (n) =>
    `${n} unsafe CREATE TABLE statement${n > 1 ? "s" : ""} \u2014 we\u2019ll add IF NOT EXISTS to each.`,
  "missing-cascade": (n) =>
    `${n} DROP FUNCTION missing CASCADE \u2014 safe cleanup gets added.`,
  "unsafe-jsonb-set": (n) =>
    `${n} jsonb_set call${n > 1 ? "s" : ""} without COALESCE \u2014 null guard gets wrapped in.`,
  "invalid-enum": (n) =>
    `${n} invalid enum value${n > 1 ? "s" : ""} flagged for review.`,
  "missing-column-in-rls": (n) =>
    `${n} RLS polic${n > 1 ? "ies" : "y"} referencing missing column${n > 1 ? "s" : ""}.`,
};

const GUIDE_MIGRATION_COPY: Record<string, (n: number) => string> = {
  "missing-if-not-exists": (n) =>
    `${n} database table${n > 1 ? "s" : ""} could cause errors if created twice \u2014 we add a safety check to each.`,
  "missing-cascade": (n) =>
    `${n} cleanup command${n > 1 ? "s" : ""} could leave orphaned data \u2014 we add proper cascading.`,
  "unsafe-jsonb-set": (n) =>
    `${n} data update${n > 1 ? "s" : ""} could crash on empty fields \u2014 we add a safety wrapper.`,
  "invalid-enum": (n) =>
    `${n} invalid value${n > 1 ? "s" : ""} in your database types \u2014 flagged for review.`,
  "missing-column-in-rls": (n) =>
    `${n} security rule${n > 1 ? "s" : ""} reference${n > 1 ? "" : "s"} a missing column.`,
};

function guideReason(reason: string): string {
  let m: RegExpMatchArray | null;
  if ((m = reason.match(/(\d+) Lovable dependenc/i)))
    return `Your project uses ${m[1]} Lovable package${+m[1] > 1 ? "s" : ""} that need${+m[1] > 1 ? "" : "s"} swapping out.`;
  if ((m = reason.match(/(\d+) OAuth call/i)))
    return "Your login page uses Lovable\u2019s auth \u2014 we\u2019ll switch it to standard Supabase.";
  if ((m = reason.match(/(\d+) migration issue/i)))
    return `${m[1]} database command${+m[1] > 1 ? "s" : ""} need${+m[1] > 1 ? "" : "s"} a small safety fix.`;
  if (reason.match(/Capacitor/i))
    return "Your mobile app settings reference Lovable.";
  if (reason.match(/[Dd]eep link/i))
    return "Your mobile app links still point to Lovable.";
  if ((m = reason.match(/(\d+) file reference/i)))
    return `${m[1]} file${+m[1] > 1 ? "s" : ""} still reference${+m[1] > 1 ? "" : "s"} Lovable code.`;
  return reason;
}

const REF_TYPE_GUIDE: Record<string, string> = {
  import: "Uses Lovable code",
  "oauth-call": "Lovable login call",
  "deep-link": "Mobile deep link",
  domain: "Lovable web address",
  tagger: "Lovable tracking code",
  "og-image": "Lovable branding image",
};

const FILE_FRIENDLY: Record<string, string> = {
  "useAuth": "Login page",
  "integrations/lovable/index": "Lovable connector",
  "integrations/lovable": "Lovable connector",
  "capacitor.config": "Mobile app config",
  "vite.config": "Build config",
  "index.html": "Homepage",
  "package.json": "Project settings",
};

function friendlyFile(path: string): string {
  for (const [pattern, name] of Object.entries(FILE_FRIENDLY)) {
    if (path.includes(pattern)) return name;
  }
  const parts = path.split("/");
  return parts[parts.length - 1];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Dashboard({
  analysis,
  onTransform,
  onReanalyse,
}: DashboardProps) {
  const { mode } = useViewMode();
  const isGuide = mode === "guide";
  const risk = riskStyles[analysis.risk.level];

  // Group references by type
  const refGroups = new Map<string, typeof analysis.lovableFiles>();
  for (const ref of analysis.lovableFiles) {
    const group = refGroups.get(ref.referenceType) ?? [];
    group.push(ref);
    refGroups.set(ref.referenceType, group);
  }

  // Group migration issues by type
  const migrationGroups = new Map<string, typeof analysis.migrations.issues>();
  for (const issue of analysis.migrations.issues) {
    const group = migrationGroups.get(issue.type) ?? [];
    group.push(issue);
    migrationGroups.set(issue.type, group);
  }

  const shortPath = (full: string) =>
    full.replace(analysis.projectPath + "/", "");

  const migCopyMap = isGuide ? GUIDE_MIGRATION_COPY : DEV_MIGRATION_COPY;
  function migrationCopy(type: string, count: number): string {
    const fn = migCopyMap[type];
    return fn ? fn(count) : `${count} ${type} issue${count > 1 ? "s" : ""}.`;
  }

  const statLabels = isGuide
    ? { deps: "Packages", refs: "Traces", sql: "DB Fixes", mig: "DB Files" }
    : { deps: "Deps", refs: "Refs", sql: "SQL", mig: "Migrations" };

  return (
    <div className="animate-fade-in">
      {/* Project path + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="font-mono text-xs text-zinc-500 mb-1">Project</div>
          <div className="font-mono text-sm text-zinc-300">
            {analysis.projectPath}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onReanalyse}
            className="px-4 py-2 text-sm border border-border text-zinc-400 rounded-lg hover:border-zinc-500 hover:text-zinc-200 transition-all duration-200"
          >
            Re-analyse
          </button>
          <button
            onClick={onTransform}
            className="px-6 py-2 text-sm bg-accent text-zinc-900 font-bold rounded-lg hover:bg-accent/90 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] active:translate-y-0 animate-pulse-glow"
          >
            Transform &rarr;
          </button>
        </div>
      </div>

      {/* Hero risk banner with inline stats */}
      <div
        className={`${risk.bg} ${risk.border} border rounded-xl p-5 mb-6 animate-slide-up`}
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`${risk.text} font-body font-bold text-xl tracking-wide`}
              >
                {isGuide ? risk.guideLabel : risk.label}
              </span>
              {!isGuide && (
                <span className="font-mono text-[10px] text-zinc-600">
                  score {analysis.risk.score}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {analysis.risk.reasons.map((reason, i) => (
                <div key={i} className="text-zinc-400 text-sm">
                  {isGuide ? guideReason(reason) : reason}
                </div>
              ))}
            </div>
          </div>

          {/* Compact stat numbers with CountUp */}
          <div className="flex gap-5 shrink-0">
            {[
              { n: analysis.lovableDeps.length, label: statLabels.deps, hot: analysis.lovableDeps.length > 0 },
              { n: analysis.lovableFiles.length, label: statLabels.refs, hot: analysis.lovableFiles.length > 0 },
              { n: analysis.migrations.issues.length, label: statLabels.sql, hot: analysis.migrations.issues.length > 0 },
              { n: analysis.migrations.fileCount, label: statLabels.mig, hot: false },
            ].map((s, i) => (
              <div key={s.label} className="text-center">
                <CountUp
                  target={s.n}
                  delay={i * 80}
                  className={`font-mono text-2xl font-semibold ${
                    s.hot ? "text-warn" : "text-accent"
                  }`}
                />
                <div className="text-zinc-500 text-[10px] uppercase tracking-widest">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Health grid */}
      <div className="mb-6 animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "backwards" }}>
        <HealthGrid analysis={analysis} />
      </div>

      {/* Dependencies as pills */}
      {analysis.lovableDeps.length > 0 && (
        <div
          className="mb-6 animate-slide-up"
          style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
        >
          <div className="text-zinc-500 text-xs uppercase tracking-widest mb-2">
            {isGuide ? "Lovable packages to remove" : "Dependencies to remove"}
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.lovableDeps.map((dep) => (
              <span
                key={dep.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warn/10 border border-warn/20 rounded-full font-mono text-xs text-warn"
              >
                {dep.name}
                {!isGuide && (
                  <span className="text-zinc-600">@{dep.version}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
      {analysis.lovableDeps.length === 0 && (
        <div
          className="mb-6 text-success text-sm animate-slide-up"
          style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
        >
          &#10003; Clean &mdash; no Lovable traces in dependencies.
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div
          className="bg-surface border border-border rounded-xl p-5 hover:border-accent/30 transition-colors duration-200 animate-slide-up"
          style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
        >
          <h3 className="text-zinc-500 text-xs uppercase tracking-widest mb-4 pb-3 border-b border-border">
            Supabase Schema
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Tables", n: analysis.supabaseSchema.tables.length },
              { label: "Views", n: analysis.supabaseSchema.views.length },
              { label: "Functions", n: analysis.supabaseSchema.functions.length },
              { label: "Enums", n: analysis.supabaseSchema.enums.length },
            ].map((s) => (
              <div key={s.label} className="bg-surface-3 rounded-lg p-3 text-center">
                <div className="font-mono text-lg text-zinc-200">{s.n}</div>
                <div className="text-zinc-500 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {analysis.capacitor && (
          <div
            className="bg-surface border border-border rounded-xl p-5 hover:border-accent/30 transition-colors duration-200 animate-slide-up"
            style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
          >
            <h3 className="text-zinc-500 text-xs uppercase tracking-widest mb-4 pb-3 border-b border-border">
              {isGuide ? "Mobile App" : "Capacitor (Mobile)"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-zinc-500 text-xs mb-1">App ID</div>
                <div className="font-mono text-sm text-zinc-300">
                  {analysis.capacitor.appId}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 text-xs mb-1">App Name</div>
                <div className="font-mono text-sm text-zinc-300">
                  {analysis.capacitor.appName}
                </div>
              </div>
            </div>
            {analysis.capacitor.hasLovableDeepLinks && (
              <div className="mt-3 text-warn text-sm">
                {isGuide
                  ? "Your mobile app links still point to Lovable."
                  : "Deep links use the Lovable scheme \u2014 needs updating."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guidance card */}
      <div
        className="bg-accent/5 border border-accent/20 rounded-xl p-5 mb-6 animate-slide-up"
        style={{ animationDelay: "180ms", animationFillMode: "backwards" }}
      >
        <div className="text-zinc-300 text-sm">
          {isGuide ? (
            <>
              Your project has{" "}
              <span className="text-accent font-bold">
                {analysis.lovableDeps.length + analysis.lovableFiles.length + analysis.migrations.issues.length}
              </span>{" "}
              things that need fixing. Click <span className="text-accent font-bold">Transform &rarr;</span> to
              preview all the changes first &mdash; nothing will be modified until you say so.
            </>
          ) : (
            <>
              Run transform with <code className="text-accent">--dry-run</code> to preview changes.
            </>
          )}
        </div>
      </div>

      {/* Collapsible sections */}
      <div className="space-y-3">
        <CollapsibleSection
          title={isGuide ? "Lovable Traces in Code" : "Code References"}
          count={analysis.lovableFiles.length}
          defaultOpen={false}
          delay={200}
        >
          {refGroups.size === 0 ? (
            <div className="text-success text-sm">
              &#10003; Clean &mdash; no Lovable references in source.
            </div>
          ) : (
            Array.from(refGroups.entries()).map(([type, refs]) => {
              const uniqueFiles = [...new Set(refs.map((r) => r.filePath))];
              return (
                <div key={type} className="mb-3 last:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-200 text-sm font-medium">
                      {isGuide
                        ? REF_TYPE_GUIDE[type] ?? type
                        : type}
                    </span>
                    <Badge color="accent">{refs.length}</Badge>
                  </div>
                  {uniqueFiles.map((file) => {
                    const sp = shortPath(file);
                    const lines = refs
                      .filter((r) => r.filePath === file)
                      .map((r) => r.line)
                      .join(", ");
                    return (
                      <div
                        key={file}
                        className="flex justify-between text-xs py-0.5 pl-3"
                      >
                        <span className="font-mono text-zinc-500 truncate mr-2">
                          {isGuide ? friendlyFile(sp) : sp}
                        </span>
                        {!isGuide && (
                          <span className="font-mono text-zinc-600 shrink-0">
                            L{lines}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title={isGuide ? "Database Fixes Needed" : "Migration Issues"}
          count={analysis.migrations.issues.length}
          defaultOpen={false}
          delay={240}
        >
          {migrationGroups.size === 0 ? (
            <div className="text-success text-sm">
              &#10003; Migrations look solid &mdash; nothing to fix.
            </div>
          ) : (
            Array.from(migrationGroups.entries()).map(([type, issues]) => (
              <div key={type} className="mb-3 last:mb-0">
                <div className="text-zinc-300 text-sm">
                  {migrationCopy(type, issues.length)}
                </div>
                {!isGuide && (
                  <div className="text-xs text-zinc-600 pl-3 mt-0.5">
                    {issues[0].fix}
                  </div>
                )}
              </div>
            ))
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CollapsibleSection
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  delay = 0,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  delay?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/30 transition-colors duration-200 animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-surface-2/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <h3 className="text-zinc-400 text-xs uppercase tracking-widest">
            {title}
          </h3>
          {count > 0 && <Badge color="warn">{count}</Badge>}
          {count === 0 && (
            <span className="text-success text-[10px] font-mono">&#10003;</span>
          )}
        </div>
        <span
          className={`text-zinc-600 text-sm transition-transform duration-200 select-none ${
            open ? "rotate-0" : "-rotate-90"
          }`}
        >
          &#8722;
        </span>
      </button>
      <div
        className={`transition-all duration-200 ease-out overflow-hidden ${
          open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5 pb-4">{children}</div>
      </div>
    </div>
  );
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "accent" | "warn";
}) {
  const styles = {
    accent: "bg-accent/10 text-accent",
    warn: "bg-warn/10 text-warn",
  };
  return (
    <span className={`${styles[color]} font-mono text-[10px] px-1.5 py-0.5 rounded`}>
      {children}
    </span>
  );
}
