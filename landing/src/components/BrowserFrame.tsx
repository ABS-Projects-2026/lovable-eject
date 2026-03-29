import { useParallax } from "../hooks/useParallax";

interface BrowserFrameProps {
  src: string;
  alt: string;
  url?: string;
  label?: string;
  parallax?: boolean;
}

export default function BrowserFrame({
  src,
  alt,
  url = "localhost:5175",
  label,
  parallax = true,
}: BrowserFrameProps) {
  const ref = useParallax<HTMLDivElement>(parallax ? 0.05 : 0);

  return (
    <div ref={ref} className="flex flex-col items-center gap-3">
      <div className="w-full rounded-xl border border-border bg-surface overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <div className="flex-1 ml-3">
            <div className="max-w-xs mx-auto bg-surface rounded-md px-3 py-1 text-xs font-mono text-zinc-500 text-center">
              {url}
            </div>
          </div>
        </div>

        {/* Screenshot */}
        <picture>
          <source srcSet={src.replace(/\.png$/, ".webp")} type="image/webp" />
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="w-full block"
          />
        </picture>
      </div>

      {label && (
        <span className="text-sm text-zinc-500 font-body">{label}</span>
      )}
    </div>
  );
}
