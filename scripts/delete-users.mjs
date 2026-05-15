// Supprime des utilisateurs de Supabase (auth.users + public.users + tables liees).
// Usage:
//   node scripts/delete-users.mjs <email1> [email2] [email3] ...        # dry-run (liste seulement)
//   node scripts/delete-users.mjs <email1> [...] --confirm                # suppression effective
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync } from 'node:fs'

if (existsSync('.env.local')) config({ path: '.env.local' })
if (existsSync('.env')) config({ path: '.env' })

const args = process.argv.slice(2)
const confirm = args.includes('--confirm')
const emails = args.filter((a) => !a.startsWith('--')).map((e) => e.toLowerCase())

if (emails.length === 0) {
  console.error('Usage: node scripts/delete-users.mjs <email...> [--confirm]')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false } })

console.log(`Mode: ${confirm ? 'DELETION' : 'DRY-RUN (ajouter --confirm pour supprimer)'}\n`)

// Pagination : recuperer tous les users auth
const targets = []
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) { console.error('listUsers error:', error); process.exit(1) }
  for (const u of data.users) {
    if (u.email && emails.includes(u.email.toLowerCase())) targets.push(u)
  }
  if (data.users.length < 1000) break
}

for (const email of emails) {
  const found = targets.find((u) => u.email.toLowerCase() === email)
  if (!found) console.log(`[skip] ${email} : non trouve dans auth.users`)
}

for (const u of targets) {
  console.log(`\n--- ${u.email} (id=${u.id}) ---`)
  console.log(`  created_at=${u.created_at} confirmed=${u.email_confirmed_at || 'no'}`)

  if (!confirm) {
    console.log('  [dry-run] aucune action')
    continue
  }

  // 1) Supprimer les lignes liees connues (best-effort, ignore erreurs si table absente).
  const linkedTables = [
    'payments',
    'favorites',
    'collections',
    'brand_requests',
    'search_logs',
    'notifications',
  ]
  for (const t of linkedTables) {
    const { error } = await admin.from(t).delete().eq('user_id', u.id)
    if (error && error.code !== '42P01' /* relation does not exist */) {
      console.log(`  [warn] delete ${t}: ${error.message}`)
    }
  }

  // 2) Supprimer public.users
  const { error: profErr } = await admin.from('users').delete().eq('id', u.id)
  if (profErr) console.log(`  [warn] delete public.users: ${profErr.message}`)
  else console.log('  public.users supprime')

  // 3) Supprimer auth.users
  const { error: authErr } = await admin.auth.admin.deleteUser(u.id)
  if (authErr) console.log(`  [ERROR] delete auth.users: ${authErr.message}`)
  else console.log('  auth.users supprime')
}

console.log('\nTermine.')
