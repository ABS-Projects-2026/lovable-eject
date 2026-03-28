import { Fragment } from "react";

const STEPS = ["Analyse", "Transform", "Deploy"] as const;

interface StepIndicatorProps {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center mb-12 animate-fade-in">
      {STEPS.map((step, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <Fragment key={step}>
            {i > 0 && (
              <div
                className={`flex-1 h-px mx-3 transition-colors duration-300 ${
                  isComplete ? "bg-success/40" : "bg-border"
                }`}
              />
            )}
            <div className="flex items-center gap-2 group">
              {isComplete ? (
                <div className="w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center text-xs font-bold transition-transform duration-200 group-hover:scale-125">
                  &#10003;
                </div>
              ) : isCurrent ? (
                <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center transition-transform duration-200 group-hover:scale-125">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center transition-transform duration-200 group-hover:scale-125">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                </div>
              )}
              <span
                className={`text-sm font-body font-medium transition-colors duration-300 ${
                  isCurrent
                    ? "text-accent"
                    : isComplete
                      ? "text-success"
                      : "text-zinc-600"
                }`}
              >
                {step}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
