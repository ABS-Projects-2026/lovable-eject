import { useState } from "react";
import PathInput from "./components/PathInput";
import Dashboard from "./components/Dashboard";
import TransformView from "./components/TransformView";
import DeployView from "./components/DeployView";
import StepIndicator from "./components/StepIndicator";
import Logo from "./components/Logo";
import FileTreeScanner from "./components/FileTreeScanner";
import { useViewMode } from "./context/ViewModeContext";

export interface AnalysisResult {
  projectPath: string;
  lovableDeps: Array<{ name: string; version: string; type: string }>;
  lovableFiles: Array<{
    filePath: string;
    referenceType: string;
    line: number;
    content: string;
  }>;
  migrations: {
    fileCount: number;
    issues: Array<{
      filePath: string;
      line: number;
      type: string;
      description: string;
      fix: string;
    }>;
  };
  supabaseSchema: {
    tables: string[];
    views: string[];
    functions: string[];
    enums: string[];
  };
  capacitor: {
    appId: string;
    appName: string;
    hasLovableDeepLinks: boolean;
  } | null;
  risk: {
    level: "simple" | "moderate" | "complex";
    score: number;
    reasons: string[];
  };
}

type View = "input" | "dashboard" | "transform" | "deploy";

const VIEW_TO_STEP: Record<View, number> = {
  input: 0,
  dashboard: 1,
  transform: 1,
  deploy: 2,
};

export default function App() {
  const [view, setView] = useState<View>("input");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [projectPath, setProjectPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { mode, setMode } = useViewMode();

  const handleAnalyse = async (path: string) => {
    setProjectPath(path);
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data: AnalysisResult = await res.json();
      setAnalysis(data);
      setView("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleTransform = () => setView("transform");
  const handleDeploy = () => setView("deploy");
  const handleBack = () => setView("dashboard");
  const handleBackFromDeploy = () => setView("transform");

  const handleReset = () => {
    setView("input");
    setAnalysis(null);
    setProjectPath("");
    setLoading(false);
    setError("");
  };

  return (
    <div className="min-h-screen relative">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-8 animate-fade-in flex items-start justify-between">
          <div className="cursor-pointer" onClick={handleReset}>
            <div className="flex items-center gap-3">
              <Logo size={28} />
              <h1 className="font-display text-5xl tracking-tight">
                <span className="text-accent">lovable</span>
                <span className="text-zinc-500">-eject</span>
              </h1>
            </div>
            <p className="mt-2 text-zinc-500 font-body text-lg">
              Migrate away from Lovable.dev &mdash; for free
            </p>
          </div>

          <div className="flex items-center bg-surface-3 rounded-full p-0.5 shrink-0 mt-2">
            <button
              onClick={() => setMode("guide")}
              className={`px-3.5 py-1.5 text-xs font-body rounded-full transition-all duration-200 ${
                mode === "guide"
                  ? "bg-accent text-zinc-900 font-bold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Guide
            </button>
            <button
              onClick={() => setMode("dev")}
              className={`px-3.5 py-1.5 text-xs font-body rounded-full transition-all duration-200 ${
                mode === "dev"
                  ? "bg-accent text-zinc-900 font-bold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Dev
            </button>
          </div>
        </header>

        <StepIndicator currentStep={VIEW_TO_STEP[view]} />

        {/* File tree scanner during analysis */}
        {view === "input" && loading && (
          <div key="scanner" className="animate-view-enter">
            <FileTreeScanner projectPath={projectPath} />
          </div>
        )}

        {view === "input" && !loading && (
          <div key="input" className="animate-view-enter">
            <PathInput onAnalyse={handleAnalyse} loading={false} error={error} />
          </div>
        )}

        {view === "dashboard" && analysis && (
          <div key="dashboard" className="animate-view-enter">
            <Dashboard
              analysis={analysis}
              onTransform={handleTransform}
              onReanalyse={() => handleAnalyse(projectPath)}
            />
          </div>
        )}

        {view === "transform" && (
          <div key="transform" className="animate-view-enter">
            <TransformView
              projectPath={projectPath}
              analysis={analysis}
              onBack={handleBack}
              onDeploy={handleDeploy}
              onComplete={() => handleAnalyse(projectPath)}
            />
          </div>
        )}

        {view === "deploy" && (
          <div key="deploy" className="animate-view-enter">
            <DeployView projectPath={projectPath} onBack={handleBackFromDeploy} />
          </div>
        )}
      </div>
    </div>
  );
}
