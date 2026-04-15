import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import Image from 'next/image'
import Link from 'next/link'
import { FolderOpen, Layers } from 'lucide-react'
import { getGoogleDriveImageUrl } from '@/lib/utils'

interface PageProps {
  params: Promise<{ token: string }>
}

async function getSharedCollection(token: string) {
  const admin = getSupabaseAdmin()

  // Fetch collection by share_token
  const { data: collection, error } = await admin
    .from('collections')
    .select('id, name, description, is_shared, share_token')
    .eq('share_token', token)
    .eq('is_shared', true)
    .single()

  if (error || !collection) return null

  // Fetch campaign IDs from collection_items
  const { data: items } = await admin
    .from('collection_items')
    .select('campaign_id')
    .eq('collection_id', collection.id)

  if (!items || items.length === 0) {
    return { collection, campaigns: [] }
  }

  const campaignIds = items.map((i: { campaign_id: string }) => i.campaign_id)

  // Fetch campaigns (only published ones)
  const { data: campaigns } = await admin
    .from('campaigns')
    .select('id, title, description, thumbnail, brand, category, platforms, format, slug')
    .in('id', campaignIds)
    .eq('status', 'Publié')

  return { collection, campaigns: campaigns || [] }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const data = await getSharedCollection(token)

  if (!data) {
    return { title: 'Collection introuvable' }
  }

  const { collection, campaigns } = data
  const description = collection.description
    || `${campaigns.length} campagne${campaigns.length > 1 ? 's' : ''} créatives sélectionnées`

  return {
    title: `${collection.name} — Laveiye`,
    description,
    openGraph: {
      title: `${collection.name} — Collection`,
      description,
      type: 'website',
      siteName: 'Laveiye',
      ...(campaigns[0]?.thumbnail ? {
        images: [{ url: getGoogleDriveImageUrl(campaigns[0].thumbnail), width: 1200, height: 630 }],
      } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${collection.name} — Collection`,
      description,
    },
  }
}

export default async function SharedCollectionPage({ params }: PageProps) {
  const { token } = await params
  const data = await getSharedCollection(token)

  if (!data) {
    notFound()
  }

  const { collection, campaigns } = data

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F8FB]">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 pb-12 pt-8">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#80368D] to-[#29358B] shadow-lg">
              <FolderOpen className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1A1F2B]">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="mt-2 text-muted-foreground max-w-xl mx-auto text-center">
                {collection.description}
              </p>
            )}
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Layers className="h-4 w-4" />
              {campaigns.length} campagne{campaigns.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Grid */}
          {campaigns.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D0E4F2] bg-white p-8 text-center">
              <p className="text-muted-foreground">Cette collection ne contient aucune campagne publiée.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  href={`/content/${c.slug || c.id}`}
                  className="group overflow-hidden rounded-xl border border-[#D0E4F2] bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#0A1F44] to-[#1a3a6e]">
                    {c.thumbnail ? (
                      <Image
                        src={getGoogleDriveImageUrl(c.thumbnail)}
                        alt={c.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-3xl font-bold text-white/20">
                          {c.title.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {c.platforms?.[0] && (
                      <div className="absolute right-2 top-2">
                        <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#1A1F2B] shadow-sm backdrop-blur-sm">
                          {c.platforms[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-[#1A1F2B] line-clamp-2 group-hover:text-[#80368D] transition-colors">
                      {c.title}
                    </h3>
                    {c.description && (
                      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
                        {c.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.category && (
                        <span className="rounded-full bg-[#80368D]/10 px-2.5 py-0.5 text-xs font-medium text-[#80368D]">
                          {c.category}
                        </span>
                      )}
                      {c.format && (
                        <span className="rounded-full bg-[#D0E4F2] px-2.5 py-0.5 text-xs font-medium text-[#1A1F2B]/70">
                          {c.format}
                        </span>
                      )}
                      {c.brand && (
                        <span className="rounded-full bg-[#D0E4F2] px-2.5 py-0.5 text-xs font-medium text-[#1A1F2B]/70">
                          {c.brand}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Footer CTA */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Créé avec Laveiye
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#80368D] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6b2d78]"
            >
              Découvrir la plateforme
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
