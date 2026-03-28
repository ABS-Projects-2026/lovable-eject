import { useState } from "react";
import { useViewMode } from "../context/ViewModeContext";

interface DependencyGraphProps {
  completedSteps: string[];
}

// Which steps break which connections
const BREAK_MAP: Record<string, string[]> = {
  "Remove Lovable dependencies": ["auth-pkg", "tagger-pkg"],
  "Replace OAuth calls": ["auth-useauth"],
  "Remove lovable-tagger from Vite config": ["tagger-vite"],
};

export default function DependencyGraph({ completedSteps }: DependencyGraphProps) {
  const { mode } = useViewMode();
  const isGuide = mode === "guide";

  const broken = new Set<string>();
  for (const step of completedSteps) {
    const lines = BREAK_MAP[step];
    if (lines) lines.forEach((l) => broken.add(l));
  }

  const authGone = broken.has("auth-pkg") && broken.has("auth-useauth");
  const taggerGone = broken.has("tagger-pkg") && broken.has("tagger-vite");
  const showSupabase = broken.has("auth-useauth");

  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="bg-surface border border-border rounded-xl p-4 mb-4 animate-fade-in">
      <div className="text-zinc-500 text-xs mb-3">
        {isGuide
          ? "Your project\u2019s connections \u2014 watch Lovable dependencies get replaced"
          : "Dependency graph"}
      </div>

      <svg viewBox="0 0 700 130" className="w-full" style={{ maxHeight: 130 }}>
        {/* Lines */}
        <Line x1={140} y1={40} x2={530} y2={25} id="auth-useauth" broken={broken} />
        <Line x1={140} y1={40} x2={530} y2={105} id="auth-pkg" broken={broken} />
        <Line x1={140} y1={95} x2={530} y2={65} id="tagger-vite" broken={broken} />
        <Line x1={140} y1={95} x2={530} y2={105} id="tagger-pkg" broken={broken} />

        {/* New supabase connections */}
        {showSupabase && (
          <line
            x1={380} y1={65} x2={530} y2={25}
            stroke="#10b981" strokeWidth={1} opacity={0.6}
            className="graph-line-draw"
          />
        )}

        {/* Lovable nodes */}
        <Node
          cx={100} cy={40} label="cloud-auth" fullLabel="@lovable.dev/cloud-auth-js"
          color="#ef4444" gone={authGone}
          hovered={hovered} setHovered={setHovered}
        />
        <Node
          cx={100} cy={95} label="tagger" fullLabel="lovable-tagger"
          color="#ef4444" gone={taggerGone}
          hovered={hovered} setHovered={setHovered}
        />

        {/* Supabase node */}
        {showSupabase && (
          <Node
            cx={350} cy={65} label="supabase" fullLabel="@supabase/supabase-js"
            color="#10b981" gone={false} entering
            hovered={hovered} setHovered={setHovered}
          />
        )}

        {/* Project file nodes */}
        <Node cx={580} cy={25} label="useAuth.tsx" fullLabel="src/hooks/useAuth.tsx" color="#71717a" gone={false} hovered={hovered} setHovered={setHovered} />
        <Node cx={580} cy={65} label="vite.config.ts" fullLabel="vite.config.ts" color="#71717a" gone={false} hovered={hovered} setHovered={setHovered} />
        <Node cx={580} cy={105} label="package.json" fullLabel="package.json" color="#71717a" gone={false} hovered={hovered} setHovered={setHovered} />
      </svg>
    </div>
  );
}

function Line({
  x1, y1, x2, y2, id, broken,
}: {
  x1: number; y1: number; x2: number; y2: number;
  id: string; broken: Set<string>;
}) {
  if (broken.has(id)) {
    return (
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#ef4444" strokeWidth={1}
        className="graph-line-break"
      />
    );
  }
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="rgba(239,68,68,0.3)" strokeWidth={1}
    />
  );
}

function Node({
  cx, cy, label, fullLabel, color, gone, entering,
  hovered, setHovered,
}: {
  cx: number; cy: number; label: string; fullLabel: string;
  color: string; gone: boolean; entering?: boolean;
  hovered: string | null; setHovered: (v: string | null) => void;
}) {
  const isHovered = hovered === label;

  if (gone) {
    return (
      <g className="graph-node-exit" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx} cy={cy} r={14} fill={color} opacity={0.15} />
        <text x={cx} y={cy + 3.5} textAnchor="middle" fill={color} fontSize={8} fontFamily="JetBrains Mono">{label}</text>
      </g>
    );
  }

  return (
    <g
      className={entering ? "graph-node-enter" : ""}
      style={entering ? { transformOrigin: `${cx}px ${cy}px` } : undefined}
      onMouseEnter={() => setHovered(label)}
      onMouseLeave={() => setHovered(null)}
      cursor="default"
    >
      <circle cx={cx} cy={cy} r={14} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1} strokeOpacity={0.3} />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fill={color} fontSize={8} fontFamily="JetBrains Mono">
        {label}
      </text>
      {isHovered && (
        <g>
          <rect x={cx - 70} y={cy - 28} width={140} height={18} rx={4} fill="#242428" stroke="#2a2a30" strokeWidth={1} />
          <text x={cx} y={cy - 16} textAnchor="middle" fill="#a1a1aa" fontSize={7} fontFamily="JetBrains Mono">
            {fullLabel}
          </text>
        </g>
      )}
    </g>
  );
}

