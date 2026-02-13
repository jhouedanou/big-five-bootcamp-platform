"use client"

/**
 * Skeleton loader pour ContentCard — style Facebook/shimmer
 * Reproduit la structure exacte du ContentCard avec des placeholders animés
 */
export function ContentCardSkeleton() {
  return (
    <div className="modern-card overflow-hidden">
      {/* Zone image — aspect-square avec shimmer */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
        {/* Shimmer overlay */}
        <div className="skeleton-shimmer absolute inset-0" />

        {/* Faux badge plateforme (top-right) */}
        <div className="absolute right-2.5 top-2.5">
          <div className="h-7 w-7 rounded-full bg-slate-300/80 dark:bg-slate-600/80" />
        </div>

        {/* Faux bouton favori (bottom-left) */}
        <div className="absolute left-2.5 bottom-2.5">
          <div className="h-8 w-8 rounded-full bg-white/60 dark:bg-slate-500/60" />
        </div>
      </div>

      {/* Zone contenu — padding identique au ContentCard */}
      <div className="p-5 space-y-3">
        {/* Titre — 2 lignes */}
        <div className="space-y-2">
          <div className="skeleton-line h-4 w-[85%] rounded-md" />
          <div className="skeleton-line h-4 w-[60%] rounded-md" />
        </div>

        {/* Résumé — 2 lignes */}
        <div className="space-y-1.5 mt-2">
          <div className="skeleton-line h-3 w-full rounded-md" />
          <div className="skeleton-line h-3 w-[75%] rounded-md" />
        </div>

        {/* Badges secteur + tags */}
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="skeleton-line h-6 w-16 rounded-full" />
          <div className="skeleton-line h-6 w-20 rounded-full" />
          <div className="skeleton-line h-6 w-14 rounded-full" />
        </div>

        {/* Footer — pays + date */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="skeleton-line h-4 w-4 rounded" />
            <div className="skeleton-line h-3 w-12 rounded-md" />
            <div className="skeleton-line h-3 w-16 rounded-md" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="skeleton-line h-4 w-4 rounded" />
            <div className="skeleton-line h-3 w-14 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Groupe de skeletons avec faux en-tête de mois (imite la structure groupée du dashboard)
 */
export function ContentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* Faux groupe 1 */}
      <section>
        {/* Faux en-tête de mois */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700">
            <div className="h-5 w-5 rounded bg-slate-300 dark:bg-slate-600" />
          </div>
          <div className="space-y-1.5">
            <div className="skeleton-line h-5 w-32 rounded-md" />
            <div className="skeleton-line h-3 w-20 rounded-md" />
          </div>
          <div className="ml-4 flex-1 border-b-2 border-dashed border-slate-200 dark:border-slate-700" />
        </div>

        {/* Grille de skeleton cards */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
            <ContentCardSkeleton key={`skeleton-a-${i}`} />
          ))}
        </div>
      </section>

      {/* Faux groupe 2 (si count > 3) */}
      {count > 3 && (
        <section>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700">
              <div className="h-5 w-5 rounded bg-slate-300 dark:bg-slate-600" />
            </div>
            <div className="space-y-1.5">
              <div className="skeleton-line h-5 w-28 rounded-md" />
              <div className="skeleton-line h-3 w-16 rounded-md" />
            </div>
            <div className="ml-4 flex-1 border-b-2 border-dashed border-slate-200 dark:border-slate-700" />
          </div>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: Math.min(count - 3, 3) }).map((_, i) => (
              <ContentCardSkeleton key={`skeleton-b-${i}`} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
