import { useEffect, useState, useCallback, useRef } from "react";

interface TerminalLine {
  text: string;
  className?: string;
}

interface TerminalProps {
  lines: TerminalLine[];
  typingSpeed?: number;
  animate?: boolean;
}

export default function Terminal({
  lines,
  typingSpeed = 30,
  animate = false,
}: TerminalProps) {
  // completedLines: indices of fully displayed lines
  // partialText: the currently-typing line's partial content
  const [completedCount, setCompletedCount] = useState(animate ? 0 : lines.length);
  const [partialText, setPartialText] = useState("");
  const [done, setDone] = useState(!animate);
  const cancelled = useRef(false);

  const runTyping = useCallback(async () => {
    for (let i = 0; i < lines.length; i++) {
      if (cancelled.current) return;
      const line = lines[i];

      if (line.text.startsWith("$")) {
        // Type command character by character
        for (let c = 0; c <= line.text.length; c++) {
          if (cancelled.current) return;
          setPartialText(line.text.slice(0, c));
          await new Promise((r) => setTimeout(r, typingSpeed));
        }
      } else {
        // Output line appears instantly
        setPartialText(line.text);
        await new Promise((r) => setTimeout(r, 40));
      }

      // Line complete — move to completed
      setPartialText("");
      setCompletedCount(i + 1);
    }

    setDone(true);
  }, [lines, typingSpeed]);

  useEffect(() => {
    if (!animate) return;
    cancelled.current = false;
    runTyping();
    return () => {
      cancelled.current = true;
    };
  }, [animate, runTyping]);

  const isTypingCommand =
    !done &&
    completedCount < lines.length &&
    lines[completedCount].text.startsWith("$") &&
    partialText.length < lines[completedCount].text.length;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
      </div>

      {/* Terminal body */}
      <div className="p-5 font-mono text-sm leading-relaxed text-left">
        {/* Completed lines */}
        {lines.slice(0, completedCount).map((line, i) => (
          <div key={i} className={line.className ?? ""}>
            {line.text || "\u00A0"}
          </div>
        ))}

        {/* Currently typing line */}
        {!done && completedCount < lines.length && partialText !== "" && (
          <div className={lines[completedCount].className ?? ""}>
            {partialText}
            {isTypingCommand && (
              <span className="cursor-blink text-accent">|</span>
            )}
          </div>
        )}

        {/* Blinking cursor after complete */}
        {done && animate && (
          <div>
            <span className="cursor-blink text-accent">|</span>
          </div>
        )}
      </div>
    </div>
  );
}
