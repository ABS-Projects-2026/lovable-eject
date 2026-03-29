import { useState, useRef, useEffect, useCallback } from "react";
import Terminal from "./Terminal";

const compactTerminalLines = [
  { text: "$ npx lovable-eject analyse ./my-project", className: "text-white" },
];

export default function Hero() {
  const [copied, setCopied] = useState(false);

  function copyCommand() {
    navigator.clipboard.writeText("npx lovable-eject analyse ./my-project");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="relative min-h-screen flex flex-col justify-center px-6 pt-24 pb-24 overflow-hidden">
      {/* Watermark price */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
        aria-hidden="true"
      >
        <span className="font-display text-[120px] sm:text-[160px] text-white/[0.04] line-through decoration-white/[0.06] whitespace-nowrap">
          £264/year
        </span>
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        {/* Top row: headline + compact terminal */}
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-8 mb-12">
          {/* Left: heading + subtext */}
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

          {/* Right: compact terminal */}
          <div className="lg:w-[42%] lg:-mr-4 lg:-rotate-2">
            <Terminal lines={compactTerminalLines} typingSpeed={30} animate />
          </div>
        </div>

        {/* Demo video */}
        <DemoVideo />
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

// ---------------------------------------------------------------------------
// DemoVideo — autoplay on viewport entry, play/pause toggle
// ---------------------------------------------------------------------------

function DemoVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // IntersectionObserver: play when visible, pause when not
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.preload = "auto";
          video.play().then(() => setPlaying(true)).catch(() => {});
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-3">
      {/* Desktop: browser frame wrapper. Mobile: bare video. */}

      {/* Browser chrome — hidden below md */}
      <div className="w-full rounded-xl md:border md:border-border md:bg-surface overflow-hidden md:shadow-[0_0_40px_rgba(34,211,238,0.06)]">
        <div className="hidden md:flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <div className="flex-1 ml-3">
            <div className="max-w-xs mx-auto bg-surface rounded-md px-3 py-1 text-xs font-mono text-zinc-500 text-center">
              localhost:5175
            </div>
          </div>
        </div>

        {/* Video */}
        <div className="relative">
          <video
            ref={videoRef}
            src="/demo.mp4"
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full block rounded-xl md:rounded-none"
          />
          <PlayPauseButton playing={playing} onClick={togglePlay} />
        </div>
      </div>

      {/* Caption */}
      <span className="text-zinc-500 font-body" style={{ fontSize: 12 }}>
        60-second demo — analyse, transform, deploy
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlayPauseButton
// ---------------------------------------------------------------------------

function PlayPauseButton({ playing, onClick }: { playing: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700/70 hover:bg-zinc-600/80 transition-colors backdrop-blur-sm"
      aria-label={playing ? "Pause video" : "Play video"}
    >
      {playing ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
          <rect x="2" y="1" width="3" height="10" rx="0.5" />
          <rect x="7" y="1" width="3" height="10" rx="0.5" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
          <polygon points="3,1 10,6 3,11" />
        </svg>
      )}
    </button>
  );
}
