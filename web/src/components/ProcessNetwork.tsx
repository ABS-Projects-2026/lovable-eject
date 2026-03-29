import { useState, useEffect, useRef, useMemo } from "react";
import { useViewMode } from "../context/ViewModeContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepState {
  name: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
  description: string;
}

interface ProcessNetworkProps {
  steps: StepState[];
  started: boolean;
}

interface ActiveSignal {
  id: number;
  pathD: string;
  label: string;
  opacity: number;
  radius: number;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const INPUT_X = 50;
const PROC_LEFT = 225;
const PROC_RIGHT = 375;
const PROC_W = 150;
const PROC_H = 20;
const OUTPUT_X = 550;
const VB_W = 600;
const VB_H = 226;

const INPUT_Y = [38, 76, 113, 151, 189];
const PROC_Y = [14, 35, 56, 77, 98, 119, 140, 161, 182, 203];
const OUTPUT_Y = [56, 113, 170];

const INPUTS = [
  { id: "auth", label: "Auth" },
  { id: "deps", label: "Deps" },
  { id: "sql", label: "SQL" },
  { id: "config", label: "Config" },
  { id: "mobile", label: "Mobile" },
];

const SHORT = [
  "Remove deps", "Replace OAuth", "Delete lovable/", "Remove tagger",
  "Fix SQL", "Clean refs", "Update Capacitor", "Create .env",
  "Create vercel.json", "Create health.js",
];

const OUTPUTS = [
  { id: "auth-out", label: "Auth" },
  { id: "db-out", label: "DB" },
  { id: "deploy-out", label: "Deploy" },
];

const IN_TO_PROC: [number, number][] = [
  [0, 1], [0, 2], [1, 0], [2, 4],
  [3, 3], [3, 5], [3, 7], [3, 8], [3, 9], [4, 6],
];

const PROC_TO_OUT: [number, number][] = [
  [0, 2], [1, 0], [2, 0], [3, 2], [4, 1],
  [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
];

// ---------------------------------------------------------------------------
// Step data maps
// ---------------------------------------------------------------------------

const STEP_FILES: string[][] = [
  ["package.json"],
  ["useAuth.tsx", "lovable/index.ts"],
  ["integrations/lovable/"],
  ["vite.config.ts"],
  ["migrations/*.sql"],
  ["index.html"],
  ["capacitor.config.ts"],
  [".env.example"],
  ["vercel.json"],
  ["api/health.js"],
];

const ACTIVITY_DEV: string[][] = [
  ["Reading package.json...", "Found @lovable.dev/cloud-auth-js", "Found lovable-tagger", "Removing...", "\u2713 Clean"],
  ["Scanning src/hooks...", "Found OAuth call at L38", "Replacing import...", "Rewriting auth call...", "\u2713 Supabase auth"],
  ["Checking integrations/lovable/...", "Found 2 files", "Backing up...", "Deleting...", "\u2713 Removed"],
  ["Reading vite.config.ts...", "Found componentTagger()", "Removing import...", "Cleaning plugins array...", "\u2713 Clean"],
  ["Scanning 3 migration files...", "Found 7 CREATE TABLE issues", "Adding IF NOT EXISTS...", "Patching 1/2...", "Patching 2/2...", "\u2713 All fixed"],
  ["Scanning index.html...", "Found 4 .lovable.app refs", "Replacing domains...", "\u2713 Updated"],
  ["Reading capacitor.config.ts...", "Found app.lovable.* ID", "Updating app ID...", "\u2713 Updated"],
  ["Generating template...", "Adding VITE_SUPABASE_URL", "Adding VITE_SUPABASE_ANON_KEY", "\u2713 Created"],
  ["Generating config...", "Adding SPA rewrites", "Adding cache headers", "\u2713 Created"],
  ["Creating api/ directory...", "Writing health.js...", "\u2713 Endpoint ready"],
];

const ACTIVITY_GUIDE: string[][] = [
  ["Checking your packages...", "Found Lovable login package", "Found Lovable tracker", "Removing...", "\u2713 Clean"],
  ["Checking your login files...", "Found Lovable login code", "Switching to Supabase...", "Updating login call...", "\u2713 Done"],
  ["Checking Lovable folder...", "Found 2 files", "Backing up...", "Removing...", "\u2713 Removed"],
  ["Checking build config...", "Found tracking code", "Removing it...", "Cleaning up...", "\u2713 Clean"],
  ["Checking database files...", "Found 7 tables to fix", "Adding safety checks...", "Fixing file 1/2...", "Fixing file 2/2...", "\u2713 All fixed"],
  ["Checking web addresses...", "Found 4 Lovable links", "Replacing with yours...", "\u2713 Updated"],
  ["Checking mobile config...", "Found Lovable app ID", "Updating...", "\u2713 Updated"],
  ["Creating settings template...", "Adding database URL", "Adding database key", "\u2713 Created"],
  ["Creating hosting config...", "Adding page routing", "Adding caching", "\u2713 Created"],
  ["Creating health check...", "Writing endpoint...", "\u2713 Ready"],
];

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function inPath(iIdx: number, pIdx: number): string {
  const iy = INPUT_Y[iIdx];
  const py = PROC_Y[pIdx];
  return `M ${INPUT_X + 11},${iy} C ${INPUT_X + 80},${iy} ${PROC_LEFT - 40},${py} ${PROC_LEFT},${py}`;
}

function outPath(pIdx: number, oIdx: number): string {
  const py = PROC_Y[pIdx];
  const oy = OUTPUT_Y[oIdx];
  return `M ${PROC_RIGHT},${py} C ${PROC_RIGHT + 40},${py} ${OUTPUT_X - 60},${oy} ${OUTPUT_X - 11},${oy}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProcessNetwork({ steps, started }: ProcessNetworkProps) {
  const { mode } = useViewMode();
  const isGuide = mode === "guide";
  const ACTIVITY = isGuide ? ACTIVITY_GUIDE : ACTIVITY_DEV;

  const [signals, setSignals] = useState<ActiveSignal[]>([]);
  const [activityLines, setActivityLines] = useState<string[]>([]);
  const [activeStepIdx, setActiveStepIdx] = useState(-1);
  const signalId = useRef(0);
  const prevStatuses = useRef(new Map<string, string>());
  const activityTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stepStatus = useMemo(() => {
    const m = new Map<number, string>();
    steps.forEach((s, i) => m.set(i, s.status));
    return m;
  }, [steps]);

  const allDone = steps.every((s) => s.status === "done" || s.status === "skipped");

  // --- Spawn signals + start activity on transitions ---
  useEffect(() => {
    steps.forEach((step, idx) => {
      const prev = prevStatuses.current.get(step.name);
      if (prev === step.status) return;

      if (step.status === "running") {
        // Spawn 3-dot input streams with file labels
        const files = STEP_FILES[idx];
        const inputConns = IN_TO_PROC.filter(([, p]) => p === idx);

        inputConns.forEach(([iIdx]) => {
          const pathD = inPath(iIdx, idx);
          // Send sequential file-labeled particles (fast)
          files.forEach((file, fi) => {
            const baseDelay = fi * 150;
            [0, 80, 160].forEach((dotDelay, di) => {
              setTimeout(() => {
                const sig: ActiveSignal = {
                  id: signalId.current++,
                  pathD,
                  label: di === 0 ? file : "",
                  opacity: di === 0 ? 1 : di === 1 ? 0.7 : 0.4,
                  radius: di === 0 ? 3 : di === 1 ? 2.5 : 2,
                };
                setSignals((p) => [...p, sig]);
                setTimeout(() => setSignals((p) => p.filter((s) => s.id !== sig.id)), 600);
              }, baseDelay + dotDelay);
            });
          });
        });

        // Start activity feed
        activityTimers.current.forEach(clearTimeout);
        activityTimers.current = [];
        setActiveStepIdx(idx);
        setActivityLines([]);

        const msgs = ACTIVITY[idx] ?? [];
        msgs.forEach((msg, mi) => {
          const t = setTimeout(() => {
            setActivityLines([msg]);
          }, mi * 200);
          activityTimers.current.push(t);
        });
      }

      if (step.status === "done") {
        // Spawn output signals (fast)
        const outputConns = PROC_TO_OUT.filter(([p]) => p === idx);
        outputConns.forEach(([, oIdx]) => {
          [0, 80, 160].forEach((dotDelay, di) => {
            setTimeout(() => {
              const sig: ActiveSignal = {
                id: signalId.current++,
                pathD: outPath(idx, oIdx),
                label: "",
                opacity: di === 0 ? 1 : di === 1 ? 0.7 : 0.4,
                radius: di === 0 ? 3 : di === 1 ? 2.5 : 2,
              };
              setSignals((p) => [...p, sig]);
              setTimeout(() => setSignals((p) => p.filter((s) => s.id !== sig.id)), 600);
            }, dotDelay);
          });
        });

        // Clear activity
        setTimeout(() => {
          if (activeStepIdx === idx) {
            setActiveStepIdx(-1);
            setActivityLines([]);
          }
        }, 600);
      }

      prevStatuses.current.set(step.name, step.status);
    });
  }, [steps, ACTIVITY]);

  // Idle flicker removed — static connections only

  // --- Helpers ---
  function connState(pIdx: number): "idle" | "active" | "complete" | "error" {
    const s = stepStatus.get(pIdx);
    if (s === "running") return "active";
    if (s === "done" || s === "skipped") return "complete";
    if (s === "error") return "error";
    return "idle";
  }

  function connStroke(state: "idle" | "active" | "complete" | "error"): string {
    if (state === "active") return "#22d3ee";
    if (state === "complete") return "#10b981";
    if (state === "error") return "#ef4444";
    return "#2a2a30";
  }

  function connWidth(state: "idle" | "active" | "complete" | "error"): number {
    return state === "active" ? 1.5 : state === "idle" ? 0.5 : 1;
  }

  function inputDone(iIdx: number): boolean {
    return IN_TO_PROC.filter(([i]) => i === iIdx).every(([, p]) => {
      const s = stepStatus.get(p); return s === "done" || s === "skipped";
    });
  }

  function inputActive(iIdx: number): boolean {
    return IN_TO_PROC.filter(([i]) => i === iIdx).some(([, p]) => stepStatus.get(p) === "running");
  }

  function outputCounts(oIdx: number): { done: number; total: number } {
    const conns = PROC_TO_OUT.filter(([, o]) => o === oIdx);
    const done = conns.filter(([p]) => {
      const s = stepStatus.get(p); return s === "done" || s === "skipped";
    }).length;
    return { done, total: conns.length };
  }

  function outputDone(oIdx: number): boolean {
    const c = outputCounts(oIdx);
    return c.done === c.total;
  }

  return (
    <div className={`bg-surface border border-border rounded-xl p-4 mb-4 animate-fade-in ${allDone ? "pn-complete-pulse" : ""}`}>
      <div className="flex justify-between text-[10px] text-zinc-600 mb-1 px-2">
        <span style={{ width: 60, textAlign: "center" }}>Source</span>
        <span style={{ textAlign: "center" }}>Transform</span>
        <span style={{ width: 60, textAlign: "center" }}>Result</span>
      </div>

      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" style={{ height: 240 }}>
        <defs>
          <filter id="signalGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="netGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" fill="#1c1c20" />
          </pattern>
        </defs>

        <rect width={VB_W} height={VB_H} fill="url(#netGrid)" />

        {/* Input→Process connections (base) */}
        {IN_TO_PROC.map(([iIdx, pIdx], ci) => {
          const state = connState(pIdx);
          return (
            <path key={`in-${ci}`} d={inPath(iIdx, pIdx)} fill="none"
              stroke={connStroke(state)}
              strokeWidth={connWidth(state)}
              strokeOpacity={state === "idle" ? 0.4 : 1}
              className="pn-connection"
            />
          );
        })}

        {/* Input→Process fill overlay for active connections */}
        {IN_TO_PROC.map(([iIdx, pIdx], ci) => {
          if (connState(pIdx) !== "active") return null;
          return (
            <path key={`in-fill-${ci}`} d={inPath(iIdx, pIdx)} fill="none"
              stroke="#22d3ee" strokeWidth={1.5}
              strokeDasharray="500" strokeDashoffset="500"
              className="pn-connection-fill"
            />
          );
        })}

        {/* Process→Output connections (base) */}
        {PROC_TO_OUT.map(([pIdx, oIdx], ci) => {
          const state = connState(pIdx);
          return (
            <path key={`out-${ci}`} d={outPath(pIdx, oIdx)} fill="none"
              stroke={connStroke(state)}
              strokeWidth={connWidth(state)}
              strokeOpacity={state === "idle" ? 0.4 : 1}
              className="pn-connection"
            />
          );
        })}

        {/* Signal particles with labels */}
        {signals.map((sig) => (
          <g key={sig.id}>
            <circle r={sig.radius} fill="#22d3ee" opacity={sig.opacity}
              filter={sig.opacity === 1 ? "url(#signalGlow)" : undefined}>
              <animateMotion dur="0.6s" fill="freeze" path={sig.pathD} />
            </circle>
            {sig.label && (
              <text fontSize={8} fill="#22d3ee" fillOpacity={0.7}
                fontFamily="JetBrains Mono" textAnchor="middle" dy={-8}>
                <animateMotion dur="0.6s" fill="freeze" path={sig.pathD} />
                {sig.label}
              </text>
            )}
          </g>
        ))}

        {/* Input nodes */}
        {INPUTS.map((input, i) => {
          const done = inputDone(i);
          const active = inputActive(i);
          return (
            <g key={input.id}>
              <circle cx={INPUT_X} cy={INPUT_Y[i]} r={11}
                fill={done ? "rgba(16,185,129,0.12)" : "#1c1c20"}
                stroke={done ? "#10b981" : active ? "#22d3ee" : "#2a2a30"}
                strokeWidth={active ? 1.5 : 1}
                className={active ? "pn-node-pulse" : ""}
                style={{ transition: "fill 400ms, stroke 400ms" }}
              />
              <InputIcon type={input.id} cx={INPUT_X} cy={INPUT_Y[i]}
                color={done ? "#10b981" : active ? "#22d3ee" : "#52525b"} />
            </g>
          );
        })}

        {/* Process nodes */}
        {PROC_Y.map((cy, i) => {
          const status = stepStatus.get(i) ?? "pending";
          const isDone = status === "done" || status === "skipped";
          const isRunning = status === "running";
          const isError = status === "error";
          const rectFill = isDone ? "rgba(16,185,129,0.12)" : isRunning ? "rgba(34,211,238,0.06)" : isError ? "rgba(239,68,68,0.12)" : "#1c1c20";
          const rectStroke = isDone ? "#10b981" : isRunning ? "#22d3ee" : isError ? "#ef4444" : "#2a2a30";
          const textFill = isDone || isRunning ? "#e4e4e7" : status === "skipped" ? "#52525b" : "#3f3f46";

          return (
            <g key={`proc-${i}`}>
              <rect x={PROC_LEFT} y={cy - PROC_H / 2} width={PROC_W} height={PROC_H} rx={4}
                fill={rectFill} stroke={rectStroke} strokeWidth={isRunning ? 1.5 : 0.8}
                className={isRunning ? "pn-node-pulse" : ""}
                style={{ transition: "fill 300ms, stroke 300ms" }}
              />
              {isRunning && (
                <rect x={PROC_LEFT + 1} y={cy + PROC_H / 2 - 2} width={PROC_W - 2} height={1.5} rx={0.75} fill="#22d3ee" opacity={0.3}>
                  <animate attributeName="width" from="0" to={String(PROC_W - 2)} dur="3s" fill="freeze" />
                </rect>
              )}
              {isDone && (
                <text x={PROC_LEFT + 8} y={cy + 3.5} fill="#10b981" fontSize={9}
                  className="check-pop" style={{ transformOrigin: `${PROC_LEFT + 8}px ${cy}px` }}>
                  &#10003;
                </text>
              )}
              <text x={isDone ? PROC_LEFT + 18 : PROC_LEFT + 10} y={cy + 3.5}
                fill={textFill} fontSize={9} fontFamily="JetBrains Mono">
                {SHORT[i]}
              </text>
            </g>
          );
        })}

        {/* Output nodes with counter */}
        {OUTPUTS.map((output, i) => {
          const done = outputDone(i);
          const counts = outputCounts(i);
          const prog = counts.total > 0 ? counts.done / counts.total : 0;
          const fill = done ? "rgba(16,185,129,0.15)" : prog > 0 ? `rgba(16,185,129,${prog * 0.1})` : "#1c1c20";
          const stroke = done ? "#10b981" : prog > 0 ? `rgba(16,185,129,${0.3 + prog * 0.4})` : "#2a2a30";
          return (
            <g key={output.id}>
              {done && (
                <circle cx={OUTPUT_X} cy={OUTPUT_Y[i]} r={11} fill="none" stroke="#10b981" strokeWidth={1} className="pn-output-ping" />
              )}
              <circle cx={OUTPUT_X} cy={OUTPUT_Y[i]} r={11} fill={fill} stroke={stroke}
                strokeWidth={done ? 1.5 : 1} style={{ transition: "fill 400ms, stroke 400ms" }} />
              <text x={OUTPUT_X} y={OUTPUT_Y[i] + (done ? 0 : -2)} textAnchor="middle"
                fill={done ? "#10b981" : counts.done > 0 ? "#a1a1aa" : "#52525b"}
                fontSize={done ? 8 : 7} fontFamily="JetBrains Mono" style={{ transition: "fill 400ms" }}>
                {done ? "\u2713" : counts.done > 0 ? `${counts.done}/${counts.total}` : output.label}
              </text>
              {done && (
                <text x={OUTPUT_X} y={OUTPUT_Y[i] + 8} textAnchor="middle" fill="#10b981" fontSize={6} fontFamily="JetBrains Mono">
                  {output.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Activity feed below SVG */}
      {activeStepIdx >= 0 && activityLines.length > 0 && (
        <div className="mt-2 bg-[#0a0a0b] rounded-lg px-3 py-2 overflow-hidden animate-fade-in" style={{ minHeight: 36 }}>
          <div className="text-zinc-600 text-[8px] font-mono mb-1 uppercase tracking-widest">{SHORT[activeStepIdx]}</div>
          {activityLines.map((line, i) => (
            <div key={`${activeStepIdx}-${i}-${line}`}
              className="font-mono text-[9px] leading-[16px] truncate animate-slide-up"
              style={{ color: i === activityLines.length - 1 ? (line.startsWith("\u2713") ? "#10b981" : "#22d3ee") : "#52525b" }}>
              {line}
            </div>
          ))}
        </div>
      )}

      <div className="text-zinc-600 text-[10px] mt-1">
        {isGuide
          ? "Watch your project migrate in real-time \u2014 each connection lights up as changes flow through"
          : "Process pipeline"}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input icons
// ---------------------------------------------------------------------------

function InputIcon({ type, cx, cy, color }: { type: string; cx: number; cy: number; color: string }) {
  const t = `translate(${cx},${cy})`;
  switch (type) {
    case "auth":
      return (
        <g transform={t} fill="none" stroke={color} strokeWidth="1" strokeLinecap="round">
          <rect x={-2.5} y={0} width={5} height={4} rx={0.8} fill={color} fillOpacity={0.2} stroke={color} />
          <path d="M-1.5,0 V-2 C-1.5,-4 1.5,-4 1.5,-2 V0" />
        </g>
      );
    case "deps":
      return (<g transform={t} fill="none" stroke={color} strokeWidth="0.8"><rect x={-3} y={-2.5} width={6} height={5} rx={0.5} /><line x1={-3} y1={-0.5} x2={3} y2={-0.5} /></g>);
    case "sql":
      return (<g transform={t} fill="none" stroke={color} strokeWidth="0.7"><rect x={-3} y={-2.5} width={6} height={5} rx={0.5} /><line x1={-3} y1={-0.5} x2={3} y2={-0.5} /><line x1={-3} y1={1.5} x2={3} y2={1.5} /><line x1={0} y1={-2.5} x2={0} y2={2.5} /></g>);
    case "config":
      return (
        <g transform={t} fill="none" stroke={color} strokeWidth="0.8">
          <circle r={2.5} /><circle r={1} fill={color} fillOpacity={0.3} />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <line key={a} x1={Math.cos((a * Math.PI) / 180) * 3} y1={Math.sin((a * Math.PI) / 180) * 3}
              x2={Math.cos((a * Math.PI) / 180) * 4} y2={Math.sin((a * Math.PI) / 180) * 4} strokeWidth="0.8" />
          ))}
        </g>
      );
    case "mobile":
      return (<g transform={t} fill="none" stroke={color} strokeWidth="0.8"><rect x={-2} y={-3.5} width={4} height={7} rx={0.8} /><line x1={-0.5} y1={2.5} x2={0.5} y2={2.5} strokeLinecap="round" /></g>);
    default: return null;
  }
}
