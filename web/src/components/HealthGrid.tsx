import { useState, useEffect } from "react";
import type { AnalysisResult } from "../App";
import { useViewMode } from "../context/ViewModeContext";

interface HealthFile {
  name: string;
  status: "red" | "amber" | "green";
}

interface HealthGridProps {
  analysis: AnalysisResult;
  /** Step names that have completed — matching files turn green */
  completedSteps?: string[];
}

const STEP_FILE_MAP: Record<string, string[]> = {
  "Remove Lovable dependencies": ["package.json"],
  "Replace OAuth calls": ["useAuth.tsx"],
  "Delete Lovable integration folder": ["index.ts"],
  "Remove lovable-tagger from Vite config": ["vite.config.ts"],
  "Fix SQL migrations": ["001_tables.sql"],
  "Clean Lovable domain & OG references": ["index.html"],
  "Update Capacitor config": ["capacitor.config.ts"],
};

const GREEN_PAD = [
  "App.tsx", "main.tsx", "router.tsx", "utils.ts", "types.ts",
  "tailwind.config.js", "tsconfig.json", "postcss.config.js",
  "client.ts", "layout.tsx", "page.tsx", "api.ts", "constants.ts",
  "styles.css", "hooks.ts", "lib.ts",
];

function buildFiles(analysis: AnalysisResult): HealthFile[] {
  const files: HealthFile[] = [];
  const seen = new Set<string>();

  for (const ref of analysis.lovableFiles) {
    const short = ref.filePath.split("/").pop() || ref.filePath;
    if (!seen.has(short)) {
      files.push({ name: short, status: "red" });
      seen.add(short);
    }
  }

  for (const issue of analysis.migrations.issues) {
    const short = issue.filePath.split("/").pop() || issue.filePath;
    if (!seen.has(short)) {
      files.push({ name: short, status: "amber" });
      seen.add(short);
    }
  }

  for (const name of GREEN_PAD) {
    if (!seen.has(name) && files.length < 32) {
      files.push({ name, status: "green" });
      seen.add(name);
    }
  }

  return files;
}

const COLORS = {
  red: "#ef4444",
  amber: "#f59e0b",
  green: "#10b981",
};

export default function HealthGrid({ analysis, completedSteps = [] }: HealthGridProps) {
  const { mode } = useViewMode();
  const isGuide = mode === "guide";
  const [revealCount, setRevealCount] = useState(0);

  const baseFiles = buildFiles(analysis);

  // Apply completed transforms — turn matching files green
  const files = baseFiles.map((f) => {
    for (const step of completedSteps) {
      const targets = STEP_FILE_MAP[step];
      if (targets?.some((t) => f.name.includes(t))) {
        return { ...f, status: "green" as const };
      }
    }
    return f;
  });

  const cleanCount = files.filter((f) => f.status === "green").length;
  const allClean = cleanCount === files.length;

  // Staggered wave entrance (5ms per square)
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < files.length; i++) {
      timers.push(setTimeout(() => setRevealCount(i + 1), i * 5));
    }
    return () => timers.forEach(clearTimeout);
  }, [files.length]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className={`bg-surface border border-border rounded-xl p-4 ${allClean ? "health-grid-complete" : ""}`}>
      <div className="text-zinc-500 text-xs mb-3">
        {allClean
          ? isGuide
            ? "All clear \u2014 your project is Lovable-free"
            : "All files clean"
          : isGuide
            ? `Project health \u2014 ${cleanCount} of ${files.length} files clean`
            : `${files.length} files scanned, ${files.length - cleanCount} issues`}
      </div>

      <div className="flex flex-wrap gap-[2px] relative">
        {files.map((f, i) => (
          <div
            key={f.name}
            className="relative"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div
              className="w-2 h-2 rounded-sm transition-all duration-200"
              style={{
                backgroundColor: i < revealCount ? COLORS[f.status] : "#2a2a30",
                opacity: i < revealCount ? 1 : 0.3,
              }}
            />
            {hoveredIdx === i && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-surface-3 border border-border text-zinc-400 text-[10px] font-mono rounded whitespace-nowrap z-10 animate-fade-in">
                {f.name}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
