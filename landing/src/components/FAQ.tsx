import { useState, useEffect, useRef } from "react";

const FAQS = [
  {
    q: "Is this tool free?",
    a: "Yes, completely free and open source. The CLI, web UI, and all transforms are MIT licensed. No paywalls, no premium tier.",
  },
  {
    q: "Will I lose my data?",
    a: "lovable-eject migrates your code, not your data. Your database rows, user accounts, and uploaded files live on Lovable\u2019s Supabase instance. We provide a step-by-step data export guide in the Deploy section to help you transfer everything to your own Supabase project.",
  },
  {
    q: "Can I undo the migration?",
    a: "Yes. Every file we modify gets a .bak backup. Run npx lovable-eject restore ./project to revert all changes instantly. We recommend committing to git before running any transforms as an extra safety net.",
  },
  {
    q: "Will my users still be able to log in?",
    a: "If your app uses authentication, existing user accounts are tied to Lovable\u2019s Supabase instance. After migration, you\u2019ll need to export and import your auth data. The tool detects this automatically and guides you through the process.",
  },
  {
    q: "What if my project has features the tool doesn\u2019t handle?",
    a: "The tool handles the most common Lovable patterns: OAuth wrappers, tagger, migration SQL issues, deep links, OG images, and Capacitor config. If your project has custom Lovable integrations we haven\u2019t seen, the analyse command will flag them and you can handle those manually.",
  },
  {
    q: "Do I need to know how to code?",
    a: "Basic terminal familiarity is helpful, but Guide mode explains every step in plain English. The web UI provides a visual dashboard where you can click through the entire migration without typing commands.",
  },
  {
    q: "How long does the migration take?",
    a: "The automated part (analyse + transform) takes under a minute. Setting up Supabase and Vercel hosting takes about 15 minutes. Total: under 30 minutes for most projects.",
  },
  {
    q: "Is this affiliated with Lovable.dev?",
    a: "No. lovable-eject is an independent open-source tool. It is not affiliated with, endorsed by, or associated with Lovable.dev.",
  },
  {
    q: "What hosting do I need after migrating?",
    a: "We guide you to Vercel (free tier) for your frontend and Supabase (free tier) for your backend. Both have generous free plans that handle most MVPs and side projects with zero hosting cost.",
  },
  {
    q: "Can I use this with projects that weren\u2019t built on Lovable?",
    a: "The tool is specifically designed for Lovable.dev projects. It looks for Lovable-specific patterns like @lovable.dev/cloud-auth-js and the integrations/lovable folder. Running it on a non-Lovable project will simply report no issues found.",
  },
];

const INITIAL_COUNT = 5;

function FAQItem({
  q,
  a,
  delay,
}: {
  q: string;
  a: string;
  delay: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("reveal");
    el.style.transitionDelay = `${delay}ms`;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <h3 className="font-body font-bold text-zinc-200 text-base">
          {q}
        </h3>
        <span
          className={`text-zinc-500 group-hover:text-zinc-300 transition-all duration-200 text-xl leading-none shrink-0 ${
            open ? "rotate-45" : "rotate-0"
          }`}
        >
          +
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{ maxHeight: open ? 300 : 0, opacity: open ? 1 : 0 }}
      >
        <p className="font-body text-[15px] text-zinc-400 pb-5 leading-relaxed">
          {a}
        </p>
      </div>
    </div>
  );
}

export default function FAQ() {
  const [showAll, setShowAll] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    el.classList.add("reveal");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visible = showAll ? FAQS : FAQS.slice(0, INITIAL_COUNT);

  return (
    <section className="max-w-3xl mx-auto px-6 py-24">
      <h2
        ref={headingRef}
        className="font-display text-3xl sm:text-4xl text-white text-center mb-12"
      >
        Frequently asked questions
      </h2>
      <div className="border-t border-border">
        {visible.map((faq, i) => (
          <FAQItem key={i} q={faq.q} a={faq.a} delay={i * 50} />
        ))}
      </div>

      {/* Show more / fewer toggle */}
      <div className="text-center mt-6">
        <button
          onClick={() => setShowAll((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-sm font-body text-accent hover:text-accent/80 transition-colors"
        >
          {showAll ? "Show fewer" : "Show more questions"}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${showAll ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </section>
  );
}
