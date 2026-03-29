import { useState } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";

const sideCards = [
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
];

export default function Problem() {
  const ref = useScrollReveal<HTMLDivElement>();
  const [months, setMonths] = useState(6);
  const spent = months * 22;
  const savedPerYear = 264;

  return (
    <section className="py-24 px-6">
      <div ref={ref} className="max-w-5xl mx-auto">
        <h2 className="font-display text-3xl sm:text-4xl text-white mb-14">
          The Lovable trap
        </h2>

        {/* Cost card — dominant, full width */}
        <div className="border-l-2 border-warn/40 bg-surface rounded-lg p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <div>
              <h3 className="font-body font-bold text-white text-2xl mb-2">
                \u00a322/month forever.
              </h3>
              <p className="font-body text-sm text-zinc-400 leading-relaxed">
                No eject button. No migration docs. You're locked in until you rewrite everything yourself.
              </p>
            </div>
          </div>

          {/* Interactive calculator */}
          <div className="bg-[#0a0a0b] rounded-lg p-5 border border-border">
            <label className="block text-xs text-zinc-500 mb-3 font-mono">
              You've been on Lovable for
              <span className="text-accent mx-1 font-bold">{months}</span>
              month{months !== 1 ? "s" : ""}
            </label>
            <input
              type="range"
              min={1}
              max={24}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full accent-accent h-1 mb-4 cursor-pointer"
            />
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-zinc-500">Spent so far:</span>
                <span className="text-warn font-mono font-bold ml-2">\u00a3{spent}</span>
              </div>
              <div>
                <span className="text-zinc-500">lovable-eject saves you:</span>
                <span className="text-success font-mono font-bold ml-2">\u00a3{savedPerYear}/year</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side cards — two columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sideCards.map((card) => (
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
