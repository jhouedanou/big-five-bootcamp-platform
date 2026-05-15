// Diagnostic: affiche l'etat reel d'un utilisateur en DB.
// Usage: node scripts/inspect-user.mjs <email>
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync } from 'node:fs'

if (existsSync('.env.local')) config({ path: '.env.local' })
if (existsSync('.env')) config({ path: '.env' })

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/inspect-user.mjs <email>')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false } })

const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
const authUser = authList.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
if (!authUser) {
  console.error('User not found in auth.users')
  process.exit(1)
}

console.log('--- auth.users ---')
console.log({
  id: authUser.id,
  email: authUser.email,
  email_confirmed_at: authUser.email_confirmed_at,
  created_at: authUser.created_at,
})

const { data: profile, error } = await admin
  .from('users')
  .select('*')
  .eq('id', authUser.id)
  .maybeSingle()

console.log('\n--- public.users ---')
if (error) console.error('Error:', error)
console.log(profile || '(aucune ligne)')
