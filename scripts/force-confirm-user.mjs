// Force-confirme un utilisateur (bypass de la vérification email) pour les tests.
//
// Usage :
//   node scripts/force-confirm-user.mjs <email>
//   node scripts/force-confirm-user.mjs <email> --password <nouveauMotDePasse>
//
// Requiert NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Petit loader .env.local (évite la dépendance dotenv)
function loadEnv(path) {
  try {
    const raw = readFileSync(resolve(process.cwd(), path), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (!m) continue
      const key = m[1]
      let value = m[2]
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch {}
}
loadEnv('.env.local')
loadEnv('.env')

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/force-confirm-user.mjs <email> [--password <new>]')
  process.exit(1)
}
const pwdIdx = process.argv.indexOf('--password')
const newPassword = pwdIdx > -1 ? process.argv[pwdIdx + 1] : null

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 1) Trouver l'utilisateur par email (pagination simple, 1000 max suffit ici).
const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (listErr) {
  console.error('listUsers error:', listErr.message)
  process.exit(1)
}
const target = list.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
if (!target) {
  console.error(`User not found: ${email}`)
  process.exit(1)
}

console.log(`Found user ${target.id} (email_confirmed_at=${target.email_confirmed_at ?? 'null'})`)

// 2) Confirmer l'email (+ reset password optionnel).
const updates = { email_confirm: true }
if (newPassword) updates.password = newPassword
const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(target.id, updates)
if (updErr) {
  console.error('updateUserById error:', updErr.message)
  process.exit(1)
}
console.log(`Email confirmed at: ${updated.user.email_confirmed_at}`)
if (newPassword) console.log(`Password reset to: ${newPassword}`)

// 3) S'assurer que le profil public.users est cohérent (verrouillé, à payer).
const { error: upsertErr } = await admin
  .from('users')
  .upsert(
    {
      id: target.id,
      email: target.email,
      name: target.user_metadata?.name || target.email,
      role: 'user',
      plan: null,
      status: 'active',
      subscription_status: 'none',
    },
    { onConflict: 'id' }
  )
if (upsertErr) console.warn('users upsert warning:', upsertErr.message)
else console.log('public.users profile ensured (locked account, must subscribe)')

// 4) Générer un magic link prêt à coller dans le navigateur (login direct sans mot de passe).
const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: target.email,
  options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/subscribe` },
})
if (linkErr) console.warn('generateLink warning:', linkErr.message)
else {
  console.log('\nMagic link (ouvrez dans un navigateur pour vous connecter sans mot de passe) :')
  console.log(link.properties?.action_link)
}
