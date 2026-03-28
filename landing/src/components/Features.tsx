import { useScrollReveal } from "../hooks/useScrollReveal";

const features = [
  {
    label: "Remove Lovable deps",
    desc: "Strips @lovable.dev/cloud-auth-js and lovable-tagger from package.json",
  },
  {
    label: "Replace OAuth",
    desc: "Rewrites Lovable auth calls to standard Supabase signInWithOAuth",
  },
  {
    label: "Delete integration folder",
    desc: "Removes src/integrations/lovable/ entirely",
  },
  {
    label: "Fix migrations",
    desc: "Adds IF NOT EXISTS, CASCADE, and COALESCE guards to all SQL",
  },
  {
    label: "Remove tagger",
    desc: "Cleans lovable-tagger from vite.config.ts",
  },
  {
    label: "Clean domains",
    desc: "Replaces *.lovable.app and OG image URLs with your domain",
  },
  {
    label: "Update Capacitor",
    desc: "Swaps app.lovable.UUID deep links with your app ID",
  },
  {
    label: "Generate .env.example",
    desc: "Creates a template with your Supabase credentials",
  },
  {
    label: "Create vercel.json",
    desc: "Adds SPA rewrite rules and cache headers",
  },
  {
    label: "Health endpoint",
    desc: "Creates api/health.js for uptime monitoring",
  },
];

export default function Features() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-24 px-6 bg-surface">
      <div ref={ref} className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-white mb-14">
          10 automated transforms
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
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
                <span className="font-body text-zinc-500 text-sm"> — {f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
