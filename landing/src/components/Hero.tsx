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
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">
      <div className="max-w-3xl mx-auto text-center">
        {/* Heading */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-[56px] text-white leading-[1.1] mb-6">
          Stop paying for Lovable hosting.
        </h1>

        {/* Subheading */}
        <p className="font-body text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
          Migrate your Lovable.dev project to free-tier Vercel + Supabase
          hosting. One command. Zero manual edits. Full backup.
        </p>

        {/* Terminal */}
        <div className="max-w-xl mx-auto mb-6">
          <Terminal lines={terminalLines} typingSpeed={30} animate />
        </div>

        {/* Copy button */}
        <button
          onClick={copyCommand}
          className="inline-flex items-center gap-2 text-sm font-mono border border-accent/40 text-accent rounded-full px-5 py-2 hover:bg-accent/10 transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {copied ? "Copied!" : "Copy to clipboard"}
        </button>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bob">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#52525b"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  );
}
