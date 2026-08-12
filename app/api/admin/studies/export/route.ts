import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkAdmin } from '@/lib/admin-auth'
import { parseLeadFilters, applyLeadFilters } from '@/lib/study-leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Plafond de sécurité pour éviter un export démesuré. */
const EXPORT_MAX_ROWS = 20_000
/** Taille de page Supabase (limite serveur par requête). */
const BATCH = 1000

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

const COLUMNS: Array<[header: string, key: string]> = [
  ['Date', 'created_at'],
  ['Prénom', 'first_name'],
  ['Nom', 'last_name'],
  ['Email', 'email'],
  ['Téléphone', 'phone'],
  ['Entreprise', 'company'],
  ['Fonction', 'job_title'],
  ['Étude', '_study'],
  ['Source', 'utm_source'],
  ['Medium', 'utm_medium'],
  ['Campagne', 'utm_campaign'],
  ['Contenu', 'utm_content'],
  ['Référent', 'referrer'],
  ['Téléchargé', '_downloaded'],
  ['Nb téléchargements', 'download_count'],
  ['Consentement', '_consent'],
]

/**
 * GET /api/admin/studies/export?studyId=&source=&from=&to=
 * Export CSV des contacts, mêmes filtres que la liste.
 */
export async function GET(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filters = parseLeadFilters(searchParams)
    const admin = getSupabaseAdmin()

    // Titres des études, pour écrire un nom lisible plutôt qu'un UUID.
    const studyTitles = new Map<string, string>()
    try {
      const { data } = await admin.from('studies').select('id, title, subtitle')
      for (const row of (data as any[]) || []) {
        studyTitles.set(row.id, row.subtitle ? `${row.title} — ${row.subtitle}` : row.title)
      }
    } catch {
      /* sans les titres, on retombe sur l'identifiant */
    }

    const rows: any[] = []
    for (let offset = 0; offset < EXPORT_MAX_ROWS; offset += BATCH) {
      let query = admin
        .from('study_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + BATCH - 1)
      query = applyLeadFilters(query, filters)

      const { data, error } = await query
      if (error) {
        if ((error as any).code === '42P01') {
          return NextResponse.json(
            { error: 'Table study_leads absente. Exécutez la migration 12.' },
            { status: 503 }
          )
        }
        throw error
      }

      const batch = (data as any[]) || []
      rows.push(...batch)
      if (batch.length < BATCH) break
    }

    const lines = [COLUMNS.map(([header]) => csvEscape(header)).join(',')]
    for (const row of rows) {
      lines.push(
        COLUMNS.map(([, key]) => {
          if (key === '_study') return csvEscape(studyTitles.get(row.study_id) || row.study_id)
          if (key === '_downloaded') return csvEscape(row.downloaded_at ? 'oui' : 'non')
          if (key === '_consent') return csvEscape(row.consent ? 'oui' : 'non')
          if (key === 'created_at') {
            return csvEscape(new Date(row.created_at).toLocaleString('fr-FR'))
          }
          return csvEscape(row[key])
        }).join(',')
      )
    }

    // BOM UTF-8 : sans lui, Excel casse les accents à l'ouverture.
    const csv = '﻿' + lines.join('\n')
    const date = new Date().toISOString().slice(0, 10)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leads-etudes-${date}.csv"`,
      },
    })
  } catch (error) {
    console.error('Erreur export leads étude:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
