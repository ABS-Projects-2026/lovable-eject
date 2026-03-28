import { useScrollReveal } from "../hooks/useScrollReveal";
import BrowserFrame from "./BrowserFrame";

export default function Showcase() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="relative py-24 px-6 bg-[#0a0a0b]">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/[0.04] rounded-full blur-[120px]" />
      </div>

      <div ref={ref} className="relative max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl text-white mb-4">
            Watch your migration happen
          </h2>
          <p className="font-body text-zinc-400 max-w-2xl mx-auto">
            Our neural network visualization shows every file flowing through
            the transform pipeline in real-time. Guide mode explains each step.
            Dev mode shows the code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <BrowserFrame
            src="/screenshots/transform-running.png"
            alt="Transform pipeline mid-execution"
            label="Mid-transform"
          />
          <BrowserFrame
            src="/screenshots/dev-mode.png"
            alt="Dev mode showing technical details"
            label="Dev mode"
          />
        </div>
      </div>
    </section>
  );
}
