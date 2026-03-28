import { useState, useRef, useEffect } from "react";
import { useViewMode } from "../context/ViewModeContext";

interface PathInputProps {
  onAnalyse: (path: string) => void;
  loading: boolean;
  error: string;
}

export default function PathInput({ onAnalyse, loading, error }: PathInputProps) {
  const { mode } = useViewMode();
  const isGuide = mode === "guide";
  const [path, setPath] = useState("");
  const [showNext, setShowNext] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (path.trim()) {
      onAnalyse(path.trim());
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Hero section */}
      <div className="mb-12">
        <h2 className="font-display text-3xl text-zinc-200 mb-4">
          Where's your Lovable project?
        </h2>
        <p className="text-zinc-500 max-w-lg leading-relaxed">
          Paste the full path to your cloned Lovable repo. We'll scan it for
          proprietary dependencies, migration issues, and auth wrappers — then
          show you exactly what needs to change.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative group">
            <div className="absolute inset-0 bg-accent/5 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <input
              ref={inputRef}
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="~/Desktop/my-lovable-project"
              className="relative w-full bg-surface border border-border rounded-xl px-5 py-4 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent/50 transition-colors duration-300"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !path.trim()}
            className="relative px-8 py-4 bg-accent text-zinc-900 font-body font-bold text-sm rounded-xl hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Analysing
              </span>
            ) : (
              "Analyse"
            )}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="animate-fade-in bg-danger/10 border border-danger/20 rounded-xl px-5 py-4 text-danger text-sm font-mono">
          {error}
        </div>
      )}

      {/* How it works */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            step: "01",
            title: "Analyse",
            desc: isGuide
              ? "We scan every file for Lovable code — takes about 2 seconds"
              : "Scan for Lovable deps, broken migrations, and auth wrappers",
          },
          {
            step: "02",
            title: "Transform",
            desc: isGuide
              ? "One click removes all proprietary code, with full backup"
              : "Remove proprietary code and fix SQL — one click, full backup",
          },
          {
            step: "03",
            title: "Deploy",
            desc: isGuide
              ? "We walk you through deploying — free hosting on Vercel"
              : "Push to Vercel + your own Supabase — £0/month hosting",
          },
        ].map((item, i) => (
          <div
            key={item.step}
            className="group animate-slide-up"
            style={{ animationDelay: `${i * 100 + 200}ms`, animationFillMode: "backwards" }}
          >
            <div className="text-accent/40 font-mono text-xs mb-3 group-hover:text-accent/70 transition-colors">
              {item.step}
            </div>
            <div className="text-zinc-200 font-body font-bold mb-1">
              {item.title}
            </div>
            <div className="text-zinc-500 text-sm leading-relaxed">
              {item.desc}
            </div>
          </div>
        ))}
      </div>

      {/* What happens next? */}
      <div className="mt-8 animate-slide-up" style={{ animationDelay: "500ms", animationFillMode: "backwards" }}>
        <button
          onClick={() => setShowNext((p) => !p)}
          className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors flex items-center gap-1"
        >
          <span className={`transition-transform duration-200 ${showNext ? "rotate-90" : ""}`}>&#9656;</span>
          What happens next?
        </button>
        {showNext && (
          <div className="mt-3 pl-4 border-l border-border text-zinc-500 text-xs space-y-2 animate-fade-in">
            <p>1. We scan every file in your project (takes about 2 seconds).</p>
            <p>2. You&rsquo;ll see a dashboard showing what needs to change.</p>
            <p>3. You choose when to apply changes &mdash; preview first, or go straight to it.</p>
            <p>4. We guide you through deploying to Vercel + Supabase.</p>
          </div>
        )}
      </div>
    </div>
  );
}
