/**
 * Script pour supprimer complètement un utilisateur (Auth + données liées)
 *
 * Usage: npx tsx --env-file=.env.local scripts/delete-user.ts <email>
 *
 * Prérequis: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY dans .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync } from 'fs'

const envLocalPath = resolve(process.cwd(), '.env.local')
const envPath = resolve(process.cwd(), '.env')
if (existsSync(envLocalPath)) config({ path: envLocalPath })
else if (existsSync(envPath)) config({ path: envPath })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant')
  process.exit(1)
}

const TARGET_EMAIL = process.argv[2]
if (!TARGET_EMAIL) {
  console.error('❌ Email requis: npx tsx --env-file=.env.local scripts/delete-user.ts <email>')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Tables avec colonne user_id (ou équivalent) à purger avant suppression auth
const USER_TABLES: { table: string; column: string }[] = [
  { table: 'favorites', column: 'user_id' },
  { table: 'brand_request_campaigns', column: 'user_id' },
  { table: 'brand_requests', column: 'user_id' },
  { table: 'collection_items', column: 'user_id' },
  { table: 'collections', column: 'user_id' },
  { table: 'notifications', column: 'user_id' },
  { table: 'payments', column: 'user_id' },
  { table: 'payouts', column: 'user_id' },
  { table: 'refunds', column: 'user_id' },
  { table: 'registrations', column: 'user_id' },
  { table: 'decrypte_registrations', column: 'user_id' },
  { table: 'keynote_registrations', column: 'user_id' },
  { table: 'scheduled_reminders', column: 'user_id' },
  { table: 'search_logs', column: 'user_id' },
  { table: 'subscription_cancellation_requests', column: 'user_id' },
  { table: 'sessions', column: 'user_id' },
]

async function main() {
  console.log(`🔍 Recherche utilisateur: ${TARGET_EMAIL}`)

  // 1. Trouver user dans auth
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) {
    console.error(`❌ listUsers: ${listErr.message}`)
    process.exit(1)
  }
  const authUser = list.users.find((u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase())
  if (!authUser) {
    console.error(`❌ Aucun utilisateur Auth avec email ${TARGET_EMAIL}`)
    process.exit(1)
  }
  const userId = authUser.id
  console.log(`✅ Trouvé: ${TARGET_EMAIL} (id=${userId})`)

  // 2. Purger tables liées
  for (const { table, column } of USER_TABLES) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq(column, userId)
    if (error) {
      console.warn(`   ⚠️  ${table}: ${error.message}`)
    } else {
      console.log(`   🗑️  ${table}: ${count ?? 0} lignes supprimées`)
    }
  }

  // 3. Supprimer profil public.users
  const { error: profileErr } = await supabase.from('users').delete().eq('id', userId)
  if (profileErr) console.warn(`   ⚠️  users: ${profileErr.message}`)
  else console.log(`   🗑️  public.users: supprimé`)

  // 4. Supprimer auth.users
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
  if (authErr) {
    console.error(`❌ auth.users: ${authErr.message}`)
    process.exit(1)
  }
  console.log(`✅ auth.users supprimé`)
  console.log(`\n🎉 Suppression complète de ${TARGET_EMAIL}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
