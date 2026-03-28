import { useScrollReveal } from "../hooks/useScrollReveal";
import BrowserFrame from "./BrowserFrame";

const steps = [
  {
    number: "1",
    title: "Analyse",
    desc: "We scan every file. Dependencies, auth wrappers, SQL issues, deep links, OG images \u2014 nothing missed.",
    screenshot: "/screenshots/guide-analyse.png",
    alt: "Analysis dashboard showing risk assessment and findings",
  },
  {
    number: "2",
    title: "Transform",
    desc: "10 automated fixes. OAuth replacement, migration patching, tagger removal, config generation. Every original file backed up.",
    screenshot: "/screenshots/transform-running.png",
    alt: "Transform pipeline running with neural network visualization",
  },
  {
    number: "3",
    title: "Deploy",
    desc: "Interactive walkthrough. Supabase linking, Vercel setup, DNS config, health checks. Done in 15 minutes.",
    screenshot: "/screenshots/transform-complete.png",
    alt: "Deploy complete with next steps checklist",
  },
];

export default function Solution() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section id="how-it-works" className="py-24 px-6">
      <div ref={ref} className="max-w-6xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-white mb-16 text-center">
          One command to freedom
        </h2>

        <div className="flex flex-col gap-24">
          {steps.map((step, i) => (
            <Step key={step.number} step={step} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({
  step,
  reverse,
}: {
  step: (typeof steps)[number];
  reverse: boolean;
}) {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`flex flex-col ${
        reverse ? "lg:flex-row-reverse" : "lg:flex-row"
      } gap-10 lg:gap-16 items-center`}
    >
      {/* Text */}
      <div className="lg:w-5/12">
        <div className="flex items-center gap-4 mb-4">
          {/* Step line connector */}
          <span className="flex-shrink-0 w-10 h-10 rounded-full border border-accent/40 flex items-center justify-center font-mono text-sm text-accent">
            {step.number}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <h3 className="font-display text-2xl text-white mb-3">{step.title}</h3>
        <p className="font-body text-zinc-400 leading-relaxed">{step.desc}</p>
      </div>

      {/* Screenshot */}
      <div className="lg:w-7/12">
        <BrowserFrame src={step.screenshot} alt={step.alt} />
      </div>
    </div>
  );
}
