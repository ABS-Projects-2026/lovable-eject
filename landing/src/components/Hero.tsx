import { useState } from "react";
import Terminal from "./Terminal";

const terminalLines = [
  { text: "$ npx lovable-eject analyse ./my-project", className: "text-white" },
  { text: "\u2714 Analysis complete", className: "text-success" },
  { text: "", className: "" },
  { text: "  Dependencies:  2 to remove", className: "text-zinc-400" },
  { text: "  References:    10 Lovable traces found", className: "text-zinc-400" },
  { text: "  SQL Issues:    7 fixes needed", className: "text-warn" },
  { text: "  Risk:          MODERATE (score: 7)", className: "text-warn" },
];

export default function Hero() {
  const [copied, setCopied] = useState(false);

  function copyCommand() {
    navigator.clipboard.writeText("npx lovable-eject analyse ./my-project");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="relative min-h-screen flex items-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Watermark price */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
        aria-hidden="true"
      >
        <span className="font-display text-[120px] sm:text-[160px] text-white/[0.04] line-through decoration-white/[0.06] whitespace-nowrap">
          £264/year
        </span>
      </div>

      <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-8 relative z-10">
        {/* Left: heading + subtext (60%) */}
        <div className="lg:w-[58%] text-center lg:text-left">
          <h1 className="font-display text-4xl sm:text-5xl md:text-[56px] text-white leading-[1.1] mb-6">
            Stop paying for<br />Lovable hosting.
          </h1>
          <p className="font-body text-lg sm:text-xl text-zinc-400 max-w-xl mb-8">
            One command. Your code, your hosting, your money.
          </p>
          <button
            onClick={copyCommand}
            className="inline-flex items-center gap-2 text-sm font-mono border border-accent/40 text-accent rounded-full px-5 py-2 hover:bg-accent/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>

        {/* Right: terminal mockup (40%), rotated for visual tension */}
        <div className="lg:w-[42%] lg:-mr-4 lg:-rotate-2">
          <Terminal lines={terminalLines} typingSpeed={30} animate />
        </div>
      </div>

      {/* Marquee ticker */}
      <div className="absolute bottom-16 left-0 right-0 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...Array(3)].map((_, rep) => (
            <span key={rep} className="font-mono text-xs text-zinc-700 tracking-wider mx-8">
              10 automated transforms &middot; 140+ tests &middot; 3 migration files fixed &middot; 2 dependencies removed &middot; 7 SQL issues patched &middot;&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bob">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  );
}
