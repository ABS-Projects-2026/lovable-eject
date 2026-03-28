import { useScrollReveal } from "../hooks/useScrollReveal";
import BrowserFrame from "./BrowserFrame";

export default function Modes() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="max-w-6xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-white mb-14 text-center">
          Built for everyone
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <BrowserFrame
            src="/screenshots/guide-analyse.png"
            alt="Guide mode dashboard with plain English explanations"
            label="Guide mode — plain English, no jargon"
            parallax={false}
          />
          <BrowserFrame
            src="/screenshots/dev-mode.png"
            alt="Dev mode dashboard with file paths and code diffs"
            label="Dev mode — file paths, line numbers, code diffs"
            parallax={false}
          />
        </div>

        <p className="text-center font-body text-zinc-500">
          Toggle between them anytime. Same data, different depth.
        </p>
      </div>
    </section>
  );
}
