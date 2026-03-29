import { useState } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";

const commands = [
  "npx lovable-eject analyse ./my-project",
  "npx lovable-eject transform ./my-project",
  "npx lovable-eject deploy ./my-project",
];

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-400">
        <span className="text-zinc-600">$ </span>
        {text}
      </span>
      <button
        onClick={copy}
        className="flex-shrink-0 text-xs text-zinc-500 hover:text-accent transition-colors px-2 py-1 rounded border border-transparent hover:border-accent/20"
        aria-label={`Copy ${text}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function CTA() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section id="get-started" className="min-h-screen flex items-center justify-center px-6 py-24">
      <div ref={ref} className="max-w-2xl mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-4xl text-white mb-12">
          Get started
        </h2>

        {/* Terminal */}
        <div className="rounded-xl border border-border bg-[#0a0a0b] overflow-hidden text-left mb-8">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="p-5 font-mono text-sm flex flex-col gap-3">
            {commands.map((cmd) => (
              <CopyLine key={cmd} text={cmd} />
            ))}
          </div>
        </div>

        {/* Social proof */}
        <p className="font-body text-sm text-zinc-600 mb-10">
          Join 50+ developers who've already migrated
        </p>

        {/* Web UI alternative */}
        <p className="font-body text-zinc-500 mb-3">Or use the web UI:</p>
        <code className="inline-block font-mono text-sm border border-border rounded-full px-4 py-1.5 text-accent bg-accent-dim mb-8">
          npm run web
        </code>

        {/* GitHub */}
        <div className="mb-16">
          <a
            href="https://github.com/ABS-Projects-2026/lovable-eject"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-body text-zinc-400 hover:text-white transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Star on GitHub
          </a>
        </div>

        {/* Footer */}
        <footer className="border-t border-border pt-8">
          <p className="font-body text-sm text-zinc-600">
            MIT License &middot; Built by developers, for developers leaving
            Lovable &middot;{" "}
            <a
              href="https://github.com/ABS-Projects-2026/lovable-eject"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-white transition-colors"
            >
              GitHub
            </a>
          </p>
          <p className="font-body text-[11px] text-zinc-600 mt-3">
            This tool is not affiliated with Lovable.dev. Use at your own risk. Always back up your code.
          </p>
        </footer>
      </div>
    </section>
  );
}
