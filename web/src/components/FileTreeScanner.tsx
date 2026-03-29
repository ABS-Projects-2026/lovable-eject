import { useState, useEffect } from "react";
import { useViewMode } from "../context/ViewModeContext";

interface FileTreeScannerProps {
  projectPath: string;
}

interface TreeEntry {
  path: string;
  depth: number;
  isDir: boolean;
  status: "red" | "amber" | "green";
}

const TREE: TreeEntry[] = [
  { path: "package.json", depth: 0, isDir: false, status: "amber" },
  { path: "src/", depth: 0, isDir: true, status: "green" },
  { path: "src/hooks/", depth: 1, isDir: true, status: "green" },
  { path: "src/hooks/useAuth.tsx", depth: 2, isDir: false, status: "red" },
  { path: "src/integrations/", depth: 1, isDir: true, status: "green" },
  { path: "src/integrations/lovable/", depth: 2, isDir: true, status: "red" },
  { path: "src/integrations/lovable/index.ts", depth: 3, isDir: false, status: "red" },
  { path: "src/integrations/supabase/", depth: 2, isDir: true, status: "green" },
  { path: "src/integrations/supabase/client.ts", depth: 3, isDir: false, status: "green" },
  { path: "src/App.tsx", depth: 1, isDir: false, status: "green" },
  { path: "supabase/", depth: 0, isDir: true, status: "green" },
  { path: "supabase/migrations/", depth: 1, isDir: true, status: "amber" },
  { path: "supabase/migrations/001_tables.sql", depth: 2, isDir: false, status: "amber" },
  { path: "capacitor.config.ts", depth: 0, isDir: false, status: "amber" },
  { path: "vite.config.ts", depth: 0, isDir: false, status: "amber" },
  { path: "index.html", depth: 0, isDir: false, status: "amber" },
];

const STATUS_COLORS = {
  red: "bg-danger",
  amber: "bg-warn",
  green: "bg-success",
};

const GUIDE_TOOLTIPS: Record<string, string> = {
  "package.json": "Your project\u2019s dependency list \u2014 checking for Lovable-specific packages",
  "src/hooks/useAuth.tsx": "Your login page \u2014 checking if it uses Lovable\u2019s auth system",
  "src/integrations/lovable/index.ts": "The Lovable connector \u2014 this will need removing",
  "src/integrations/lovable/": "Lovable\u2019s proprietary code folder",
  "src/integrations/supabase/": "Your database connection \u2014 this stays",
  "supabase/migrations/": "Database setup files \u2014 checking for common issues",
  "capacitor.config.ts": "Mobile app settings \u2014 checking for Lovable deep links",
  "vite.config.ts": "Build configuration \u2014 checking for Lovable tracking code",
  "index.html": "Your homepage \u2014 checking for Lovable domain references",
};

export default function FileTreeScanner({ projectPath }: FileTreeScannerProps) {
  const { mode } = useViewMode();
  const isGuide = mode === "guide";
  const [entryCount, setEntryCount] = useState(0);
  const [dotCount, setDotCount] = useState(0);
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);

  // Reveal entries — guide mode is slower so tooltips are readable
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const interval = isGuide ? 200 : 80;
    for (let i = 0; i < TREE.length; i++) {
      timers.push(setTimeout(() => setEntryCount(i + 1), i * interval));
      timers.push(setTimeout(() => setDotCount(i + 1), i * interval + 200));
    }
    return () => timers.forEach(clearTimeout);
  }, [isGuide]);

  // Guide-mode tooltip scheduling
  useEffect(() => {
    if (!isGuide) {
      setTooltipIdx(null);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const interval = 200;
    for (let i = 0; i < TREE.length; i++) {
      if (GUIDE_TOOLTIPS[TREE[i].path]) {
        timers.push(setTimeout(() => setTooltipIdx(i), i * interval));
      }
    }
    timers.push(setTimeout(() => setTooltipIdx(null), TREE.length * interval + 1500));
    return () => timers.forEach(clearTimeout);
  }, [isGuide]);

  const tooltipText = tooltipIdx !== null ? GUIDE_TOOLTIPS[TREE[tooltipIdx]?.path] ?? null : null;

  return (
    <div className="animate-fade-in">
      <div className="bg-surface border border-border rounded-xl overflow-hidden relative" style={{ height: 340 }}>
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border">
          <div className="text-zinc-300 text-sm font-body font-bold flex items-center">
            Scanning your project<span className="loading-dots" />
          </div>
          <div className="font-mono text-xs text-zinc-600 mt-1 truncate">
            {projectPath}
          </div>
        </div>

        {/* Tree */}
        <div className="px-5 py-3 overflow-y-auto relative" style={{ height: 240 }}>
          {/* Scan line */}
          <div className="scan-line" />

          {TREE.map((entry, i) => {
            const visible = i < entryCount;
            const dotVisible = i < dotCount;
            return (
              <div
                key={entry.path}
                className="flex items-center justify-between py-[3px] transition-all duration-300 relative"
                style={{
                  paddingLeft: entry.depth * 16,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(-8px)",
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-zinc-600 text-[10px] shrink-0 w-3 text-center">
                    {entry.isDir ? (visible ? "\u25BC" : "\u25B6") : "\u00B7"}
                  </span>
                  <span className={`font-mono text-xs truncate ${entry.isDir ? "text-zinc-400" : "text-zinc-500"}`}>
                    {entry.path.split("/").pop() || entry.path}
                  </span>
                </div>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[entry.status]} transition-all duration-200`}
                  style={{
                    opacity: dotVisible ? 1 : 0,
                    transform: dotVisible ? "scale(1)" : "scale(0)",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Guide tooltip — positioned outside scroll area, inside card */}
        {isGuide && tooltipIdx !== null && tooltipText && (
          <div
            key={tooltipIdx}
            className="absolute right-5 guide-tooltip bg-surface-2 border border-border rounded-lg py-2 px-3 text-zinc-400 font-body z-10 pointer-events-none"
            style={{ fontSize: 12, maxWidth: 280, top: 76 + tooltipIdx * 22 }}
          >
            {tooltipText}
          </div>
        )}

        {/* Footer counter */}
        <div className="px-5 py-2 border-t border-border">
          <div className="text-zinc-600 text-xs font-mono">
            Scanned {Math.min(entryCount, TREE.length)} of {TREE.length} files...
          </div>
        </div>
      </div>

      {/* Guide text */}
      <p className="text-zinc-600 text-xs mt-3 leading-relaxed">
        Checking every file for Lovable-specific code, broken migrations, and proprietary dependencies...
      </p>
    </div>
  );
}
