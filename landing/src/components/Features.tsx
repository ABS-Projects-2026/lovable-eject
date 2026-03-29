import { useScrollReveal } from "../hooks/useScrollReveal";

const features = [
  {
    label: "Replace OAuth",
    desc: "Rewrites Lovable\u2019s proprietary login to standard Supabase auth",
  },
  {
    label: "Fix migrations",
    desc: "Adds safety checks to every database command so deployments don\u2019t fail",
  },
  {
    label: "Remove dependencies",
    desc: "Strips all Lovable-specific packages and replaces them with open-source alternatives",
  },
  {
    label: "Update deep links",
    desc: "Fixes mobile app IDs and URL schemes from Lovable\u2019s to yours",
  },
];

export default function Features() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-24 px-6 bg-surface">
      <div ref={ref} className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-white mb-14">
          What it fixes
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 mb-10">
          {features.map((f) => (
            <div key={f.label} className="flex items-start gap-3">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="flex-shrink-0 mt-0.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div>
                <span className="font-body font-bold text-white text-sm">
                  {f.label}
                </span>
                <span className="font-body text-zinc-500 text-sm"> &mdash; {f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="font-body text-sm text-zinc-500">
          Plus 6 more automated transforms.{" "}
          <a
            href="https://github.com/ABS-Projects-2026/lovable-eject"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            See the full list on GitHub
          </a>
          .
        </p>
      </div>
    </section>
  );
}
