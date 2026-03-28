import { useScrollReveal } from "../hooks/useScrollReveal";

const cards = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    title: "Proprietary auth wrapper.",
    desc: "@lovable.dev/cloud-auth-js is baked into your code. No standard Supabase auth.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    title: "Broken migrations.",
    desc: "Missing IF NOT EXISTS, no CASCADE, unsafe jsonb_set. Your database deployments will fail.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    title: "\u00a322/month forever.",
    desc: "No eject button. No migration docs. You're locked in until you rewrite everything yourself.",
  },
];

export default function Problem() {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-white mb-14">
          The Lovable trap
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card.title}
              className="border-l-2 border-warn/40 bg-surface rounded-lg p-6 pl-7"
            >
              <div className="mb-4">{card.icon}</div>
              <h3 className="font-body font-bold text-white text-lg mb-2">
                {card.title}
              </h3>
              <p className="font-body text-sm text-zinc-400 leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
