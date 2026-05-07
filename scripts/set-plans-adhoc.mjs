// Met à jour les plans via l'API REST Supabase (service role).
import fs from 'node:fs';

const envFile = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envFile.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Variables manquantes : NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function findUser(emailLike) {
  const url = `${SUPABASE_URL}/rest/v1/users?select=id,email,name,plan,subscription_status,subscription_end_date&email=ilike.${encodeURIComponent(emailLike)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

async function updatePlan(userId, plan) {
  const now = new Date();
  const end = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const url = `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      plan,
      subscription_status: 'active',
      subscription_start_date: now.toISOString(),
      subscription_end_date: end.toISOString(),
      updated_at: now.toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log('=== Recherche utilisateurs ===');
  const analyticsCandidates = await findUser('%analytics%');
  console.log('analytics ->', JSON.stringify(analyticsCandidates, null, 2));
  const picCandidates = await findUser('jm1n4xf%');
  console.log('jm1n4xf ->', JSON.stringify(picCandidates, null, 2));

  const analyticsUser =
    analyticsCandidates.find(
      (u) => u.email.toLowerCase().includes('analytics') && u.email.toLowerCase().includes('bigfive')
    ) || analyticsCandidates[0];

  if (analyticsUser) {
    console.log('\n=== Upgrade analytics → Basic ===');
    const r = await updatePlan(analyticsUser.id, 'Basic');
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.warn('⚠️  Utilisateur analytics bigfive introuvable');
  }

  const picUser = picCandidates.find((u) => u.email.toLowerCase() === 'jm1n4xf@picdirect.net');
  if (picUser) {
    console.log('\n=== Upgrade jm1n4xf@picdirect.net → Pro ===');
    const r = await updatePlan(picUser.id, 'Pro');
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.warn('⚠️  Utilisateur jm1n4xf@picdirect.net introuvable');
  }
}

main().catch((e) => {
  console.error('ERREUR:', e);
  process.exit(1);
});
