import { NextResponse } from "next/server"
import { checkAdmin } from "@/lib/admin-auth"
import { getSupabaseAdmin } from "@/lib/supabase-server"
import { safeErrorMessage } from "@/lib/api-errors"
import { PARAM_ALIASES } from "@/lib/datalayer"
import { OBSERVABLE_SOURCES, TRACKING_SPEC } from "@/lib/tracking-spec"

export const dynamic = "force-dynamic"

const WINDOWS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30 }

/**
 * Deux paramètres du brief ne vivent pas dans `metadata` : ils ont leur propre
 * colonne. Les chercher dans la metadata les ferait passer pour manquants.
 */
const COLUMN_PARAMS: Record<string, "user_id" | "source"> = {
  user_id: "user_id",
  source_context: "source",
}

/**
 * GET /api/admin/tracking?window=7d
 *
 * État de la mesure, événement par événement du brief : est-ce qu'il arrive,
 * combien de fois, et porte-t-il les paramètres exigés ?
 *
 * La question à laquelle cette route répond n'est pas « combien d'utilisateurs »
 * mais « est-ce que le dispositif fonctionne ». C'est un outil de recette, pas
 * un tableau de bord d'audience.
 */
export async function GET(request: Request) {
  try {
    const admin = await checkAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const windowKey = new URL(request.url).searchParams.get("window") || "7d"
    const days = WINDOWS[windowKey] ?? 7
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const supabase = getSupabaseAdmin()

    // Deux requêtes par nom interne : le compte de la fenêtre (avec la
    // dernière occurrence, qui sert à inspecter les paramètres) et le compte
    // toutes-périodes. Ce dernier départage deux silences qui n'appellent pas
    // la même réaction : « jamais reçu » (instrumentation pas déployée, ou
    // fonction jamais utilisée) et « rien sur la période » (la mesure
    // fonctionne, l'action ne s'est pas produite).
    const perSource = await Promise.all(
      OBSERVABLE_SOURCES.map(async (name) => {
        const [windowed, allTime] = await Promise.all([
          supabase
            .from("analytics_events")
            .select("created_at, metadata, user_id, source", { count: "exact" })
            .eq("event_name", name)
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .limit(1),
          supabase
            .from("analytics_events")
            .select("*", { count: "exact", head: true })
            .eq("event_name", name),
        ])
        const row = (windowed.data as any[])?.[0] ?? null
        return {
          name,
          count: windowed.count ?? 0,
          totalCount: allTime.count ?? 0,
          lastSeen: row?.created_at ?? null,
          lastRow: row,
        }
      })
    )
    const bySource = new Map(perSource.map((s) => [s.name, s]))

    const events = TRACKING_SPEC.map((entry) => {
      const stats = entry.sources.map((s) => bySource.get(s)).filter(Boolean) as typeof perSource
      const count = stats.reduce((sum, s) => sum + s.count, 0)
      const totalCount = stats.reduce((sum, s) => sum + s.totalCount, 0)
      const lastSeen =
        stats
          .map((s) => s.lastSeen)
          .filter(Boolean)
          .sort()
          .pop() ?? null

      // Paramètres réellement portés par la dernière occurrence. Les clés
      // internes sont traduites par la même table de renommage que le dataLayer,
      // sinon `campaign_id` passerait pour un `content_id` manquant.
      let missingParams: string[] = []
      const freshest = stats.find((s) => s.lastSeen === lastSeen)
      if (freshest?.lastRow) {
        const aliases = PARAM_ALIASES[entry.event] ?? {}
        const seen = new Set(
          Object.entries(freshest.lastRow.metadata ?? {})
            .filter(([, v]) => v !== null && v !== undefined && v !== "")
            .map(([k]) => aliases[k] ?? k)
        )
        missingParams = entry.params.filter((p) => {
          const column = COLUMN_PARAMS[p]
          // La colonne d'abord, les métadonnées ensuite. `account_created` est
          // écrit AVANT qu'une session existe — quand une confirmation e-mail
          // est requise, la colonne `user_id` est vide alors que l'événement
          // porte bien l'identifiant. Ne regarder que la colonne le déclarait
          // manquant à tort.
          if (column) return !freshest.lastRow[column] && !seen.has(p)
          return !seen.has(p)
        })
      }

      return {
        event: entry.event,
        priority: entry.priority,
        section: entry.section,
        trigger: entry.trigger,
        params: entry.params,
        observability: entry.observability,
        where: entry.where,
        note: entry.note ?? null,
        count,
        totalCount,
        lastSeen,
        missingParams,
      }
    })

    // Flux récent : ce que la base a reçu en dernier, tous événements confondus.
    const { data: recent } = await supabase
      .from("analytics_events")
      .select("event_name, created_at, source, page_url, user_id")
      .order("created_at", { ascending: false })
      .limit(30)

    return NextResponse.json({
      window: windowKey in WINDOWS ? windowKey : "7d",
      since,
      events,
      recent: recent ?? [],
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Erreur serveur", details: safeErrorMessage(err) },
      { status: 500 }
    )
  }
}
