import { useState, useCallback } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="relative px-2.5 py-1 text-xs font-mono rounded-md border border-border text-zinc-500 hover:text-accent hover:border-accent/40 transition-colors duration-150"
    >
      {copied ? (
        <>
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-3 border border-success/20 text-success text-xs rounded whitespace-nowrap animate-fade-in">
            Copied!
          </span>
          <span className="text-success">Copied!</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}
