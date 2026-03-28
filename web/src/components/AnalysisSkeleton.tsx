export default function AnalysisSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Scanning label */}
      <div className="text-zinc-500 text-sm mb-8 flex items-center">
        Scanning project<span className="loading-dots" />
      </div>

      {/* Risk banner skeleton */}
      <div className="skeleton-shimmer rounded-xl h-28 mb-6" />

      {/* Pills skeleton */}
      <div className="flex gap-2 mb-6">
        <div className="skeleton-shimmer rounded-full h-8 w-48" />
        <div className="skeleton-shimmer rounded-full h-8 w-36" />
        <div className="skeleton-shimmer rounded-full h-8 w-28" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="skeleton-shimmer rounded-xl h-40" />
        <div className="skeleton-shimmer rounded-xl h-40" />
      </div>

      {/* Collapsible sections */}
      <div className="space-y-3">
        <div className="skeleton-shimmer rounded-xl h-12" />
        <div className="skeleton-shimmer rounded-xl h-12" />
      </div>
    </div>
  );
}
