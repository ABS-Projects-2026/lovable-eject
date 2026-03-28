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

const NEXT_STEPS = [
  { text: "Run npm install in your project", command: "npm install", why: "Updates your dependencies to remove Lovable packages" },
  { text: "Run npm run build", command: "npm run build", why: "Verifies everything compiles after the migration" },
  { text: "Replace YOUR_DOMAIN.com with your actual domain", command: null, why: "Search your project files for this placeholder and replace it" },
  { text: "Replace com.yourapp.name with your mobile app ID", command: null, why: "Only needed if your app has a Capacitor mobile config" },
  { text: "Set up your hosting", command: null, why: null },
];

function CopyPill({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 font-mono text-xs bg-surface-3 border border-border rounded-md px-2 py-0.5 text-zinc-400 hover:text-accent hover:border-accent/30 transition-colors ml-1"
      aria-label={`Copy ${text}`}
    >
      {text}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </svg>
      {copied && <span className="text-success text-[10px]">Copied</span>}
    </button>
  );
}

export default function TransformView({
  projectPath,
  analysis,
  onBack,
  onDeploy,
  onComplete,
}: TransformViewProps) {
  const { mode } = useViewMode();
  const isGuide = mode === "guide";
  const topRef = useRef<HTMLDivElement>(null);

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

  const realComplete = complete && !dryRun;

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

  // Auto-scroll to top on real completion
  useEffect(() => {
    if (realComplete && topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [realComplete]);

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
    <div className="animate-fade-in" ref={topRef}>
      {/* Success banner — non-dry-run completion */}
      {realComplete && (
        <div className="bg-[#052e16] border border-success/30 rounded-xl p-6 mb-6 animate-slide-up">
          <h2 className="font-display text-3xl text-success mb-2">Migration complete</h2>
          <p className="text-zinc-300 text-sm">
            All transforms applied successfully. Your original files are backed up as <code className="text-accent">.bak</code>
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={onBack} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors mb-2 flex items-center gap-1">
            &larr; Back to analysis
          </button>
          <h2 className="font-display text-3xl text-zinc-200">
            {complete ? (dryRun ? "Preview complete" : "What to do now") : "Transform"}
          </h2>
        </div>
        {/* Pre-start buttons */}
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
        {/* Post real-complete: small re-run link */}
        {realComplete && (
          <button onClick={onComplete} className="text-zinc-500 text-xs hover:text-zinc-300 transition-colors">
            Re-run analysis &rarr;
          </button>
        )}
      </div>
      {!started && (
        <p className="text-zinc-500 text-xs text-right mt-[-16px] mb-4">
          By proceeding, you confirm you have a git commit or backup of your project.
        </p>
      )}

      {/* Next steps checklist — shown prominently for real completion */}
      {realComplete && (
        <div className="bg-surface border border-border rounded-xl p-6 mb-6 animate-slide-up">
          <div className="space-y-4">
            {NEXT_STEPS.map((item, i) => {
              const isLast = i === NEXT_STEPS.length - 1;
              return (
                <div key={i} className={isLast ? "" : "border-b border-border pb-4"}>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    {!isLast && (
                      <input
                        type="checkbox"
                        checked={checklist.has(i)}
                        onChange={() => toggleCheck(i)}
                        className="accent-success w-4 h-4 mt-1 shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${checklist.has(i) && !isLast ? "text-zinc-600 line-through" : "text-zinc-200"}`}>
                        <span className="text-zinc-500 mr-2">{i + 1}.</span>
                        {item.text}
                        {item.command && <CopyPill text={item.command} />}
                      </div>
                      {item.why && (
                        <div className="text-xs text-zinc-500 mt-1 ml-5">{item.why}</div>
                      )}
                      {isLast && (
                        <button
                          onClick={onDeploy}
                          className="mt-3 w-full py-3 bg-accent text-zinc-900 font-bold text-sm rounded-xl hover:bg-accent/90 hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] animate-pulse-glow"
                        >
                          Continue to Deploy &rarr;
                        </button>
                      )}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* All systems clean label */}
      {realComplete && (
        <div className="text-center text-success text-xs mb-4 -mt-2 animate-fade-in">
          &#10003; All systems clean
        </div>
      )}

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

      {/* Steps — de-emphasised after real completion */}
      <div className={`space-y-2 ${realComplete ? "opacity-60" : ""} transition-opacity duration-500`}>
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

      {/* Complete actions — dry-run only */}
      {complete && dryRun && (
        <div className="mt-8 animate-slide-up">
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
