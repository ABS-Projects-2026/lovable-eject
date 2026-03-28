import { useState, useCallback, useRef, useEffect } from "react";
import { useViewMode } from "../context/ViewModeContext";
import type { AnalysisResult } from "../App";
import ProcessNetwork from "./ProcessNetwork";
import CodeMorph from "./CodeMorph";
import HealthGrid from "./HealthGrid";

interface TransformViewProps {
  projectPath: string;
  analysis: AnalysisResult | null;
  onBack: () => void;
  onDeploy: () => void;
  onComplete: () => void;
}

interface StepState {
  name: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
  description: string;
}

const STEP_NAMES = [
  "Remove Lovable dependencies",
  "Replace OAuth calls",
  "Delete Lovable integration folder",
  "Remove lovable-tagger from Vite config",
  "Fix SQL migrations",
  "Clean Lovable domain & OG references",
  "Update Capacitor config",
  "Create .env.example",
  "Create vercel.json",
  "Create health endpoint",
];

const GUIDE_STEP_DESC: Record<string, string> = {
  "Remove Lovable dependencies": "Removing Lovable packages and replacing them with standard ones.",
  "Replace OAuth calls": "Switching from Lovable\u2019s login system to Supabase\u2019s built-in login.",
  "Delete Lovable integration folder": "Removing the Lovable connector code your app no longer needs.",
  "Remove lovable-tagger from Vite config": "Removing Lovable\u2019s tracking code from your build setup.",
  "Fix SQL migrations": "Adding safety checks so your database setup won\u2019t break if run more than once.",
  "Clean Lovable domain & OG references": "Replacing Lovable web addresses with your own domain.",
  "Update Capacitor config": "Updating your mobile app ID from Lovable\u2019s to yours.",
  "Create .env.example": "Creating a template for your Supabase credentials.",
  "Create vercel.json": "Setting up Vercel hosting configuration.",
  "Create health endpoint": "Adding a health check URL for monitoring.",
};

const GUIDE_STATUS_DESC: Record<string, string> = {
  "Remove Lovable dependencies": "Removing Lovable packages...",
  "Replace OAuth calls": "Replacing Lovable login code with standard Supabase auth...",
  "Delete Lovable integration folder": "Cleaning up Lovable connector...",
  "Remove lovable-tagger from Vite config": "Removing tracking code from build setup...",
  "Fix SQL migrations": "Adding safety checks to database commands...",
  "Clean Lovable domain & OG references": "Replacing Lovable addresses with yours...",
  "Update Capacitor config": "Updating mobile app settings...",
  "Create .env.example": "Creating credentials template...",
  "Create vercel.json": "Setting up hosting config...",
  "Create health endpoint": "Adding monitoring endpoint...",
};

const STEP_DIFFS: Record<string, { before: string[]; after: string[]; guideLabel: string; devLabel: string }> = {
  "Remove Lovable dependencies": {
    before: ['"@lovable.dev/cloud-auth-js": "^1.0.0",', '"lovable-tagger": "^2.0.0",'],
    after: ["// removed from package.json"],
    guideLabel: "Removing Lovable packages from your project...",
    devLabel: "package.json",
  },
  "Replace OAuth calls": {
    before: ['import { lovable } from "@/integrations/lovable";', "lovable.auth.signInWithOAuth(google, {", "  redirect_uri: callbackUrl", "});"],
    after: ['import { supabase } from "@/integrations/supabase/client";', "supabase.auth.signInWithOAuth({", "  provider: google,", "  options: { redirectTo: callbackUrl }", "});"],
    guideLabel: "Switching your login from Lovable to Supabase...",
    devLabel: "src/hooks/useAuth.tsx",
  },
  "Remove lovable-tagger from Vite config": {
    before: ['import { componentTagger } from "lovable-tagger";', "// plugins: [react(), componentTagger()]"],
    after: ["// import removed", "// plugins: [react()]"],
    guideLabel: "Removing tracking code from your build...",
    devLabel: "vite.config.ts",
  },
  "Fix SQL migrations": {
    before: ["CREATE TABLE users (", "DROP FUNCTION IF EXISTS fn;", "jsonb_set(metadata, ...)"],
    after: ["CREATE TABLE IF NOT EXISTS users (", "DROP FUNCTION IF EXISTS fn CASCADE;", "jsonb_set(COALESCE(metadata, '{}'), ...)"],
    guideLabel: "Adding safety checks to database setup...",
    devLabel: "supabase/migrations/*.sql",
  },
};

export default function TransformView({
  projectPath,
  analysis,
  onBack,
  onDeploy,
  onComplete,
}: TransformViewProps) {
  const { mode } = useViewMode();
  const isGuide = mode === "guide";

  const [steps, setSteps] = useState<StepState[]>(
    STEP_NAMES.map((name) => ({ name, status: "pending", description: "" }))
  );
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [checklist, setChecklist] = useState<Set<number>>(new Set());

  // Buffered steps for ProcessNetwork — slowed down so users can follow
  const [bufferedSteps, setBufferedSteps] = useState<StepState[]>(
    STEP_NAMES.map((name) => ({ name, status: "pending", description: "" }))
  );
  const bufferQueue = useRef<Array<{ name: string; status: StepState["status"]; description: string }>>([]);
  const bufferProcessing = useRef(false);
  const bufferSeen = useRef(new Set<string>());
  const rawCompleteRef = useRef(false);

  function enqueueBuffered(name: string, status: StepState["status"], description: string) {
    const key = `${name}:${status}`;
    if (bufferSeen.current.has(key)) return;
    bufferSeen.current.add(key);
    bufferQueue.current.push({ name, status, description });
    drainBuffer();
  }

  function drainBuffer() {
    if (bufferProcessing.current || bufferQueue.current.length === 0) return;
    bufferProcessing.current = true;
    const event = bufferQueue.current.shift()!;
    setBufferedSteps((prev) =>
      prev.map((s) => s.name === event.name ? { ...s, status: event.status, description: event.description } : s)
    );
    // Minimum display time per status
    const delay = event.status === "running" ? 2500 : event.status === "skipped" ? 300 : 500;
    setTimeout(() => {
      bufferProcessing.current = false;
      drainBuffer();
    }, delay);
  }

  // Feed real step changes into the buffer queue
  useEffect(() => {
    if (!started) return;
    steps.forEach((step) => enqueueBuffered(step.name, step.status, step.description));
  }, [steps, started]);

  const completedStepNames = steps.filter((s) => s.status === "done" || s.status === "skipped").map((s) => s.name);
  const runningStep = steps.find((s) => s.status === "running");
  const runningIdx = runningStep ? steps.indexOf(runningStep) : -1;

  const toggleDiff = (name: string) => {
    setExpandedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleCheck = (i: number) => {
    setChecklist((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const runTransform = useCallback(async () => {
    setStarted(true);
    setComplete(false);
    setExpandedDiffs(new Set());
    setChecklist(new Set());
    bufferQueue.current = [];
    bufferSeen.current = new Set();
    bufferProcessing.current = false;
    rawCompleteRef.current = false;
    setBufferedSteps(STEP_NAMES.map((name) => ({ name, status: "pending", description: "" })));
    setSteps(STEP_NAMES.map((name) => ({ name, status: "pending", description: "" })));

    try {
      const response = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: projectPath, dryRun }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.name === "__complete__") { setComplete(true); continue; }
            setSteps((prev) =>
              prev.map((step) =>
                step.name === data.name
                  ? { ...step, status: data.status, description: data.description }
                  : step
              )
            );
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      console.error("Transform error:", err);
    }
  }, [projectPath, dryRun]);

  const doneCount = steps.filter((s) => s.status === "done" || s.status === "skipped").length;
  const progress = (doneCount / steps.length) * 100;
  const totalIssues = analysis
    ? analysis.lovableDeps.length + analysis.lovableFiles.length + analysis.migrations.issues.length
    : 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={onBack} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors mb-2 flex items-center gap-1">
            &larr; Back to analysis
          </button>
          <h2 className="font-display text-3xl text-zinc-200">
            {complete ? (dryRun ? "Preview complete" : "All done.") : "Transform"}
          </h2>
        </div>
        {!started && (
          <div className="flex gap-3">
            <button
              onClick={() => { setDryRun(true); runTransform(); }}
              className="px-6 py-3 bg-accent text-zinc-900 font-bold text-sm rounded-xl hover:bg-accent/90 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] active:translate-y-0"
            >
              Preview changes
            </button>
            <button
              onClick={() => { setDryRun(false); runTransform(); }}
              className="px-5 py-3 text-sm border border-border text-zinc-400 rounded-xl hover:border-zinc-500 hover:text-zinc-200 transition-all duration-200"
            >
              Apply changes
              <span className="block text-[10px] text-zinc-600 font-normal">skips preview</span>
            </button>
          </div>
        )}
      </div>

      {/* Pre-start info panel */}
      {!started && (
        <div className="bg-surface border border-border rounded-xl p-5 mb-6 animate-slide-up">
          <p className="text-zinc-300 text-sm">
            {isGuide
              ? `This will make ${totalIssues > 0 ? totalIssues : "several"} changes to your project. Every original file gets a .bak backup. Preview first (recommended) or apply directly.`
              : `${STEP_NAMES.length} transform steps. All originals backed up as .bak. Use preview mode to inspect changes before applying.`}
          </p>
        </div>
      )}

      {/* Process network — visible from the start, driven by buffered steps for pacing */}
      <ProcessNetwork steps={bufferedSteps} started={started} />

      {/* Health grid — persists through transform */}
      {analysis && started && (
        <div className="mb-4 animate-fade-in">
          <HealthGrid analysis={analysis} completedSteps={completedStepNames} />
        </div>
      )}

      {/* Progress bar */}
      {started && (
        <div className="mb-4 animate-fade-in relative">
          <div className="flex justify-between text-xs text-zinc-500 mb-2">
            <span>
              {complete
                ? dryRun
                  ? `Previewed ${doneCount} of ${steps.length} steps \u2014 your files are safe.`
                  : `All ${doneCount} transforms landed.`
                : isGuide && runningStep
                  ? `Step ${runningIdx + 1} of ${steps.length} \u2014 ${GUIDE_STATUS_DESC[runningStep.name] ?? "Working..."}`
                  : runningStep
                    ? `Step ${runningIdx + 1}/${steps.length} \u2014 ${runningStep.name}`
                    : "Transforming\u2026"}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className={`h-1 bg-surface-3 rounded-full overflow-hidden relative ${complete && !dryRun ? "success-ripple" : ""}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${complete && !dryRun ? "bg-success" : "bg-accent"}`}
              style={{ width: `${progress}%` }}
            />
            {complete && !dryRun && <span className="ripple-ring" />}
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step) => {
          const diff = STEP_DIFFS[step.name];
          const isVisible = !started || step.status !== "pending";
          const isRunning = step.status === "running";
          const isDone = step.status === "done";
          const showCodeMorph = isDone && diff;
          const diffVisible = showCodeMorph && (isGuide ? expandedDiffs.has(step.name) : true);

          return (
            <div
              key={step.name}
              className={`step-card bg-surface border rounded-xl px-5 py-4 ${
                isRunning ? "step-running border-accent/40"
                  : isDone ? "step-done-flash border-success/20"
                  : step.status === "error" ? "border-danger/20"
                  : "border-border"
              } ${!isVisible ? "step-hidden" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StepIcon status={step.status} />
                  <div>
                    <span className={`text-sm font-medium ${step.status === "pending" ? "text-zinc-600" : "text-zinc-200"}`}>
                      {step.name}
                    </span>
                    {isGuide && GUIDE_STEP_DESC[step.name] && step.status !== "pending" && (
                      <div className="text-xs text-zinc-500 mt-0.5">{GUIDE_STEP_DESC[step.name]}</div>
                    )}
                  </div>
                </div>
                {step.description && !isGuide && (
                  <span className={`font-mono text-xs ${step.status === "error" ? "text-danger" : step.status === "skipped" ? "text-zinc-600" : "text-zinc-500"}`}>
                    {step.description}
                  </span>
                )}
              </div>

              {/* Guide mode diff toggle */}
              {isGuide && isDone && diff && !expandedDiffs.has(step.name) && (
                <button onClick={() => toggleDiff(step.name)} className="mt-2 text-accent text-xs hover:underline">
                  See what changed
                </button>
              )}
              {isGuide && isDone && diff && expandedDiffs.has(step.name) && (
                <button onClick={() => toggleDiff(step.name)} className="mt-2 text-zinc-500 text-xs hover:underline">
                  Hide diff
                </button>
              )}

              {/* Code morph for key transforms */}
              {showCodeMorph && (
                <div className={`diff-panel ${diffVisible ? "diff-visible" : ""}`}>
                  <CodeMorph
                    before={diff.before}
                    after={diff.after}
                    trigger={diffVisible ?? false}
                    guideLabel={diff.guideLabel}
                    devLabel={diff.devLabel}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Complete actions */}
      {complete && (
        <div className="mt-8 animate-slide-up">
          {dryRun ? (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-5">
              <p className="text-zinc-300 text-sm mb-4">
                Preview mode &mdash; your files are safe, nothing changed. Ready to apply for real?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setDryRun(false); setStarted(false); setComplete(false); }}
                  className="px-6 py-2 bg-accent text-zinc-900 font-bold text-sm rounded-lg hover:bg-accent/90 hover:-translate-y-0.5 transition-all duration-200"
                >
                  Run for real
                </button>
                <button onClick={onBack} className="px-4 py-2 text-sm border border-border text-zinc-400 rounded-lg hover:border-zinc-500 hover:text-zinc-200 transition-all">
                  Back to analysis
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-success/5 border border-success/20 rounded-xl p-5">
              <p className="text-zinc-300 text-sm mb-4">
                All transforms applied. Originals backed up as <code className="text-accent">.bak</code> files.
              </p>

              {/* Checklist */}
              <div className="space-y-2 mb-5">
                {[
                  { text: "Run npm install to update your packages", why: "The old Lovable packages were removed — npm needs to sync your node_modules." },
                  { text: "Run npm run build to check everything compiles", why: "Confirms the code transforms didn't break any imports or types." },
                  { text: "Replace YOUR_DOMAIN.com with your actual domain", why: "We replaced Lovable URLs with placeholders that you need to fill in." },
                  { text: "Replace com.yourapp.name with your mobile app ID", why: "Only needed if you have a Capacitor mobile app." },
                  { text: "Click Deploy \u2192 to set up hosting", why: "Walk through Supabase + Vercel setup to go live." },
                ].map((item, i) => (
                  <div key={i}>
                    <label className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checklist.has(i)}
                        onChange={() => toggleCheck(i)}
                        className="accent-success w-4 h-4 mt-0.5 shrink-0"
                      />
                      <span className={`text-sm ${checklist.has(i) ? "text-zinc-600 line-through" : "text-zinc-300"}`}>
                        {item.text}
                      </span>
                    </label>
                    {isGuide && (
                      <div className="text-xs text-zinc-600 pl-6 mt-0.5">{item.why}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onDeploy}
                  className="px-6 py-2 bg-accent text-zinc-900 font-bold text-sm rounded-lg hover:bg-accent/90 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] animate-pulse-glow"
                >
                  Deploy &rarr;
                </button>
                <button onClick={onComplete} className="px-4 py-2 text-sm border border-border text-zinc-400 rounded-lg hover:border-zinc-500 hover:text-zinc-200 transition-all">
                  Re-analyse to verify
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepIcon({ status }: { status: StepState["status"] }) {
  const base = "w-5 h-5 flex items-center justify-center rounded-full text-xs";
  switch (status) {
    case "pending":
      return <div className={`${base} border border-zinc-700 text-zinc-700`}><span className="w-1.5 h-1.5 rounded-full bg-zinc-700" /></div>;
    case "running":
      return (
        <div className={`${base} border border-accent text-accent`}>
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      );
    case "done":
      return <div className={`${base} bg-success/20 text-success check-pop`}>&#10003;</div>;
    case "skipped":
      return <div className={`${base} bg-surface-3 text-zinc-500`}>&ndash;</div>;
    case "error":
      return <div className={`${base} bg-danger/20 text-danger`}>&#10005;</div>;
  }
}
