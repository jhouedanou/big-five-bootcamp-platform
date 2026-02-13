/**
 * Branded page loader — used by loading.tsx route files
 * Uses the Big Five violet (#80368D) primary color
 */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-4 border-[#80368D]/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#80368D] animate-spin" />
      </div>
      {label && (
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  );
}
