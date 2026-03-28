import { useState, useEffect } from "react";

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

export default function FileTreeScanner({ projectPath }: FileTreeScannerProps) {
  const [entryCount, setEntryCount] = useState(0);
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < TREE.length; i++) {
      timers.push(setTimeout(() => setEntryCount(i + 1), i * 80));
      timers.push(setTimeout(() => setDotCount(i + 1), i * 80 + 200));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

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
                className="flex items-center justify-between py-[3px] transition-all duration-300"
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
