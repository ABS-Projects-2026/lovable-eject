import { useState, useEffect, useCallback, useRef } from "react";
import CopyButton from "./CopyButton";
import { useViewMode } from "../context/ViewModeContext";

interface DeployViewProps {
  projectPath: string;
  onBack: () => void;
}

interface DeployData {
  customDomain: string | null;
  envVars?: Array<{ key: string; value: string; description: string }>;
  dnsInstructions?: Array<{ type: string; name: string; value: string }>;
  healthCheck?: {
    ok: boolean;
    status?: number;
    error?: string;
    body?: unknown;
  };
  uptimeRobotInstructions: string[];
}

// "Why this matters" callouts for Guide mode
const CARD_WHY: Record<string, string> = {
  supabase: "Your app\u2019s database was managed by Lovable. This step gives you full control of your own Supabase project.",
  env: "Your app needs these credentials to connect to your database. Without them, nothing will load.",
  dns: "This points your domain to your new hosting instead of Lovable\u2019s servers.",
  health: "This confirms your app is actually running after deployment. If this fails, something went wrong.",
  uptime: "Free monitoring that pings your app every 5 minutes. You\u2019ll get an email if it ever goes down.",
};

const CARD_KEYS = ["supabase", "env", "dns", "health", "uptime"] as const;

export default function DeployView({ projectPath, onBack }: DeployViewProps) {
  const { mode } = useViewMode();
  const isGuide = mode === "guide";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deployData, setDeployData] = useState<DeployData | null>(null);
  const [projectRef, setProjectRef] = useState("");
  const [deployedUrl, setDeployedUrl] = useState("");
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<
    DeployData["healthCheck"] | null
  >(null);

  // Guide mode: track card open states and which have been opened
  const [cardOpen, setCardOpen] = useState<Record<string, boolean>>({});
  const [everOpened, setEverOpened] = useState<Set<string>>(new Set());
  const [showComplete, setShowComplete] = useState(false);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Initialize card states based on mode
  useEffect(() => {
    if (isGuide) {
      // Only first card open in guide mode
      setCardOpen({
        supabase: true,
        env: false,
        dns: false,
        health: false,
        uptime: false,
      });
      setEverOpened(new Set(["supabase"]));
    } else {
      // Dev mode: all except uptime open (original behavior)
      setCardOpen({
        supabase: true,
        env: true,
        dns: !!deployData?.customDomain,
        health: true,
        uptime: false,
      });
    }
  }, [isGuide, deployData?.customDomain]);

  // Guide mode: check if all cards have been opened
  useEffect(() => {
    if (!isGuide) return;
    if (CARD_KEYS.every((k) => everOpened.has(k)) && !showComplete) {
      setShowComplete(true);
    }
  }, [everOpened, isGuide, showComplete]);

  const toggleCard = (key: string) => {
    setCardOpen((prev) => {
      const isOpening = !prev[key];
      if (isGuide && isOpening) {
        setEverOpened((s) => {
          const next = new Set(s);
          next.add(key);
          return next;
        });
        // Smooth scroll to the card in guide mode
        setTimeout(() => {
          cardRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
      return { ...prev, [key]: !prev[key] };
    });
  };

  useEffect(() => {
    const fetchDeploy = async () => {
      try {
        const res = await fetch("/api/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: projectPath }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Deploy check failed");
        }
        const data: DeployData = await res.json();
        setDeployData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchDeploy();
  }, [projectPath]);

  const handleHealthCheck = useCallback(async () => {
    if (!deployedUrl.trim()) return;
    setCheckingHealth(true);
    setHealthResult(null);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: projectPath, deployedUrl }),
      });
      const data: DeployData = await res.json();
      setHealthResult(data.healthCheck ?? null);
    } catch {
      setHealthResult({ ok: false, error: "Request failed" });
    } finally {
      setCheckingHealth(false);
    }
  }, [projectPath, deployedUrl]);

  const envVars = projectRef.trim()
    ? [
        {
          key: "VITE_SUPABASE_URL",
          value: `https://${projectRef.trim()}.supabase.co`,
          description: "Your Supabase project URL",
        },
        {
          key: "VITE_SUPABASE_ANON_KEY",
          value: "<your-anon-key-from-supabase-dashboard>",
          description: "Supabase anon/public key (Project Settings \u2192 API)",
        },
      ]
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <button onClick={onBack} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors mb-4 flex items-center gap-1">
          &larr; Back
        </button>
        <div className="bg-danger/10 border border-danger/20 rounded-xl px-5 py-4 text-danger text-sm font-mono">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <button onClick={onBack} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors mb-2 flex items-center gap-1">
            &larr; Back to transform
          </button>
          <h2 className="font-display text-3xl text-zinc-200">Deploy</h2>
        </div>
        <div className="font-mono text-xs text-zinc-600 truncate max-w-xs">
          {projectPath}
        </div>
      </div>

      {/* Progress summary */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 mb-6 animate-slide-up">
        <p className="text-zinc-300 text-sm">
          {isGuide
            ? "You\u2019re almost there! Complete these steps to go live. You can skip any step you\u2019ve already done."
            : "Complete the deployment steps below. Skip any already done."}
        </p>
        <p className="text-zinc-600 text-xs mt-1">
          ~15 minutes for most projects
        </p>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {/* 1. Supabase Setup */}
        <CollapsibleCard
          title="Supabase Setup"
          open={cardOpen.supabase ?? true}
          onToggle={() => toggleCard("supabase")}
          delay={0}
          cardRef={(el) => { cardRefs.current.supabase = el; }}
        >
          <div className="space-y-3 text-sm text-zinc-400">
            {isGuide && (
              <p className="text-zinc-500 text-xs italic">
                {CARD_WHY.supabase}
              </p>
            )}
            <p>Link your project to a Supabase instance and push migrations:</p>
            <div className="bg-surface-3 rounded-lg p-4 font-mono text-xs text-zinc-300 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <code>supabase link --project-ref &lt;your-ref&gt;</code>
                <CopyButton text="supabase link --project-ref " label="Copy" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <code>supabase db push</code>
                <CopyButton text="supabase db push" label="Copy" />
              </div>
            </div>
            <p className="text-zinc-600 text-xs">
              Find your project ref in the Supabase dashboard URL:
              app.supabase.com/project/<span className="text-accent">your-ref</span>
            </p>
          </div>
        </CollapsibleCard>

        {/* 2. Environment Variables */}
        <CollapsibleCard
          title="Environment Variables"
          open={cardOpen.env ?? true}
          onToggle={() => toggleCard("env")}
          delay={100}
          cardRef={(el) => { cardRefs.current.env = el; }}
        >
          <div className="space-y-4">
            {isGuide && (
              <p className="text-zinc-500 text-xs italic">
                {CARD_WHY.env}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={projectRef}
                onChange={(e) => setProjectRef(e.target.value)}
                placeholder="Enter Supabase project ref"
                className="flex-1 bg-surface-3 border border-border rounded-lg px-4 py-2.5 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            {envVars ? (
              <div className="space-y-2">
                {envVars.map((v) => (
                  <div key={v.key} className="bg-surface-3 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs text-accent mb-1">{v.key}</div>
                      <div className="font-mono text-xs text-zinc-300 truncate">{v.value}</div>
                      <div className="text-xs text-zinc-600 mt-1">{v.description}</div>
                    </div>
                    <CopyButton text={`${v.key}=${v.value}`} label="Copy" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-600 text-xs">
                Enter your project ref above to see the env vars.
              </p>
            )}
            <p className="text-zinc-500 text-xs">
              Add these in your Vercel project &rarr; Settings &rarr; Environment Variables.
            </p>
          </div>
        </CollapsibleCard>

        {/* 3. DNS Records */}
        <CollapsibleCard
          title="Custom Domain &amp; DNS"
          open={cardOpen.dns ?? false}
          onToggle={() => toggleCard("dns")}
          delay={200}
          cardRef={(el) => { cardRefs.current.dns = el; }}
        >
          {isGuide && (
            <p className="text-zinc-500 text-xs italic mb-3">
              {CARD_WHY.dns}
            </p>
          )}
          {deployData?.customDomain ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Detected domain reference:{" "}
                <code className="text-accent font-mono text-xs">{deployData.customDomain}</code>
              </p>
              {deployData.dnsInstructions && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-zinc-600 text-left">
                        <th className="pb-2 pr-6">Type</th>
                        <th className="pb-2 pr-6">Name</th>
                        <th className="pb-2 pr-6">Value</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody className="text-zinc-300">
                      {deployData.dnsInstructions.map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="py-2 pr-6">{r.type}</td>
                          <td className="py-2 pr-6">{r.name}</td>
                          <td className="py-2 pr-6">{r.value}</td>
                          <td className="py-2">
                            <CopyButton text={r.value} label="Copy" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-zinc-600 text-xs">
                Add the domain in Vercel &rarr; Project Settings &rarr; Domains after configuring DNS.
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">
              No custom domain detected. You can add one later in Vercel settings.
            </p>
          )}
        </CollapsibleCard>

        {/* 4. Health Check */}
        <CollapsibleCard
          title="Health Check"
          open={cardOpen.health ?? true}
          onToggle={() => toggleCard("health")}
          delay={300}
          cardRef={(el) => { cardRefs.current.health = el; }}
        >
          <div className="space-y-3">
            {isGuide && (
              <p className="text-zinc-500 text-xs italic">
                {CARD_WHY.health}
              </p>
            )}
            <p className="text-sm text-zinc-400">
              Verify your deployment is live by checking the{" "}
              <code className="font-mono text-xs text-accent">/api/health</code> endpoint.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={deployedUrl}
                onChange={(e) => setDeployedUrl(e.target.value)}
                placeholder="https://your-app.vercel.app"
                className="flex-1 bg-surface-3 border border-border rounded-lg px-4 py-2.5 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-accent/50 transition-colors"
              />
              <button
                onClick={handleHealthCheck}
                disabled={!deployedUrl.trim() || checkingHealth}
                className="px-5 py-2.5 text-sm bg-accent text-zinc-900 font-bold rounded-lg hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] whitespace-nowrap flex items-center gap-2"
              >
                {checkingHealth && <span className="pulse-dot" />}
                {checkingHealth ? "Checking" : "Check"}
              </button>
            </div>
            {healthResult && (
              <div
                className={`rounded-lg p-4 text-sm animate-fade-in ${
                  healthResult.ok
                    ? "bg-success/10 border border-success/20 text-success"
                    : "bg-danger/10 border border-danger/20 text-danger"
                }`}
              >
                {healthResult.ok ? (
                  <span>&#10003; Health check passed &mdash; status {healthResult.status}</span>
                ) : (
                  <span>&#10005; {healthResult.error ?? `Failed with status ${healthResult.status}`}</span>
                )}
              </div>
            )}
          </div>
        </CollapsibleCard>

        {/* 5. UptimeRobot */}
        <CollapsibleCard
          title="UptimeRobot Monitoring"
          open={cardOpen.uptime ?? false}
          onToggle={() => toggleCard("uptime")}
          delay={400}
          cardRef={(el) => { cardRefs.current.uptime = el; }}
        >
          <div className="space-y-3">
            {isGuide && (
              <p className="text-zinc-500 text-xs italic">
                {CARD_WHY.uptime}
              </p>
            )}
            <p className="text-sm text-zinc-400">
              Set up free monitoring to prevent Vercel cold starts and get downtime alerts.
            </p>
            {deployData?.uptimeRobotInstructions && (
              <div className="space-y-1.5 text-sm text-zinc-500">
                {deployData.uptimeRobotInstructions.map((line, i) => (
                  <p key={i} className="font-mono text-xs">{line}</p>
                ))}
              </div>
            )}
            <a
              href="https://uptimerobot.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-accent text-sm hover:underline"
            >
              Open UptimeRobot
              <span className="text-xs">&nearr;</span>
            </a>
          </div>
        </CollapsibleCard>
      </div>

      {/* Guide mode: "You're all set!" completion message */}
      {isGuide && showComplete && (
        <div className="mt-6 text-center animate-slide-up relative">
          <div className="inline-flex items-center gap-2 text-success text-sm font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            You&rsquo;re all set!
          </div>
          {/* Confetti dots */}
          <div className="relative inline-block ml-2">
            {[
              { tx: "24px", ty: "-16px", bg: "bg-success" },
              { tx: "-20px", ty: "-24px", bg: "bg-accent" },
              { tx: "32px", ty: "8px", bg: "bg-success" },
              { tx: "-16px", ty: "12px", bg: "bg-accent" },
            ].map((dot, i) => (
              <span
                key={i}
                className={`guide-confetti-dot ${dot.bg}`}
                style={
                  {
                    "--tx": dot.tx,
                    "--ty": dot.ty,
                    animationDelay: `${i * 50}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CollapsibleCard — controlled open state
// ---------------------------------------------------------------------------

function CollapsibleCard({
  title,
  open,
  onToggle,
  delay = 0,
  cardRef,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  delay?: number;
  cardRef?: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={cardRef}
      className="bg-surface border border-border rounded-xl overflow-hidden animate-slide-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-surface-2/50 transition-colors"
      >
        <h3 className="text-zinc-300 text-sm font-body font-bold tracking-wide">
          {title}
        </h3>
        <span
          className={`text-zinc-600 text-lg transition-transform duration-200 ${
            open ? "rotate-0" : "-rotate-90"
          }`}
        >
          &#8722;
        </span>
      </button>
      <div
        className={`transition-all duration-200 ease-out overflow-hidden ${
          open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
