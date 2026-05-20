// Audit + correction des plans des utilisateurs bootcamp.
//
// Contexte du bug :
//   - `scripts/create-bulk-users.ts` ne définissait pas `subscription_end_date`.
//   - `DashboardNavbar` ne montre le badge "Basic"/"Pro" QUE si
//     `isPremium && subInfo.active`, et `subInfo.active` exige une
//     `subscription_end_date` future. Sans date, le header retombe sur le
//     badge jaune "Découverte" — même si `users.plan = 'Basic' | 'Pro'`.
//   - Conséquence visible : un abonné Basic voit "Découverte" dans le header.
//
// Ce script :
//   1. Charge la liste source-de-vérité (email -> plan attendu).
//   2. Récupère pour chaque user son état DB.
//   3. Compare et liste les corrections nécessaires.
//   4. Si --apply, applique les UPDATE :
//        plan correct, subscription_status='active',
//        subscription_start_date=now, subscription_end_date=now+365j.
//   5. Détecte aussi les "stragglers" : tout autre user (hors liste) ayant
//      plan IN ('Basic','Pro') sans subscription_end_date OU status non
//      'active'. Pas modifié sans confirmation, juste loggé.
//
// Usage :
//   node --env-file=.env.local scripts/audit-bootcamp-plans.mjs            # dry-run
//   node --env-file=.env.local scripts/audit-bootcamp-plans.mjs --apply    # exécute

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

const APPLY = process.argv.includes('--apply');
const DURATION_DAYS = 365;

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

// Source de vérité : exactement la liste partagée par l'utilisateur.
// Plans stockés en DB : 'Basic' | 'Pro' (capitalisés, cf lib/pricing.ts).
const EXPECTED = [
  ['minofarel@gmail.com', 'Basic'],
  ['nguessanjeanbaptiste51@gmail.com', 'Pro'],
  ['nouria.keita.nk@gmail.com', 'Basic'],
  ['mnourakone@gmail.com', 'Pro'],
  ['byaniq@gmail.com', 'Basic'],
  ['fariksanogo@gmail.com', 'Pro'],
  ['muriel.ogoussan@red-africa.com', 'Basic'],
  ['chavelinedidangouane@yahoo.fr', 'Pro'],
  ['moidonatien2003@gmail.com', 'Basic'],
  ['faliagroup@yahoo.com', 'Pro'],
  ['moullodb@gmail.com', 'Basic'],
  ['diallo.rahma@outlook.com', 'Pro'],
  ['sadjara035@gmail.com', 'Basic'],
  ['emmanuelcocoukouadio@gmail.com', 'Pro'],
  ['manguellerub10@gmail.com', 'Basic'],
  ['anatofrancissagbo@gmail.com', 'Pro'],
  ['ricardoedouh2000@gmail.com', 'Basic'],
  ['innoagnama@gmail.com', 'Pro'],
  ['hermann.kokora@prosuma.ci', 'Basic'],
  ['housscarmelia30@gmail.com', 'Pro'],
  ['bonouelisee500@gmail.com', 'Basic'],
  ['ohounfor@gmail.com', 'Pro'],
  ['chabissombolo@gmail.com', 'Basic'],
  ['rudy.gansey@yahoo.com', 'Pro'],
  ['eahogannon@gmail.com', 'Basic'],
  ['konefatima42@gmail.com', 'Pro'],
  ['stratdigitalflb@gmail.com', 'Basic'],
  ['florineeba767@gmail.com', 'Pro'],
  ['zannouhonorat9@gmail.com', 'Basic'],
  ['abraham.kouibeon@gmail.com', 'Pro'],
  ['axel.rodelobo11@gmail.com', 'Basic'],
  ['stephanie@palabres-consulting.com', 'Pro'],
  ['inamaryseboni@gmail.com', 'Basic'],
  ['walbykac@gmail.com', 'Pro'],
  ['bahjoel10@gmail.com', 'Basic'],
  ['gnakpa.theophile@gmail.com', 'Pro'],
  ['ossouhi97@gmail.com', 'Basic'],
  ['eliegem120@gmail.com', 'Pro'],
  ['franck@bigfiveabidjan.com', 'Basic'],
  ['k.toure@agencemi.com', 'Pro'],
  ['mohamedidriss57@gmail.com', 'Basic'],
  ['moussabationo73@gmail.com', 'Pro'],
  ['lineyao65@gmail.com', 'Basic'],
  ['benedictions27@gmail.com', 'Pro'],
  ['stephanekouame610@gmail.com', 'Basic'],
  ['bensabih6@gmail.com', 'Pro'],
  ['bantouqueenmusic@gmail.com', 'Basic'],
  ['shellasos2001@gmail.com', 'Pro'],
  ['hk.kokora@gmail.com', 'Basic'],
  ['morelledossoudossa30@gmail.com', 'Pro'],
  ['mikefangla2@gmail.com', 'Basic'],
  ['florentin.lallog@gmail.com', 'Pro'],
  ['asgelvis3@gmail.com', 'Basic'],
  ['ricardoedouh@sankobenin.com', 'Pro'],
  ['steph.houngue@gmail.com', 'Basic'],
  ['martiniensouza@gmail.com', 'Pro'],
  ['bourdexdavid@gmail.com', 'Basic'],
  ['siaka28youg@outlook.fr', 'Pro'],
  ['nancygozan5@gmail.com', 'Basic'],
  ['arthuroloude22@gmail.com', 'Pro'],
  ['sossoujenn@gmail.com', 'Basic'],
  ['ahouangbassadavid@gmail.com', 'Pro'],
  ['judicaehouenou98@gmail.com', 'Basic'],
  ['abrahamkouassi15@gmail.com', 'Pro'],
  ['gsstraore@gmail.com', 'Basic'],
  ['koukponoukalvin9@gmail.com', 'Pro'],
  ['perfedro@gmail.com', 'Basic'],
  ['sagbohanhelyone@gmail.com', 'Pro'],
  ['agomuolinda7@gmail.com', 'Basic'],
  ['tonamiegaba228@gmail.com', 'Pro'],
  ['deencm11@gmail.com', 'Basic'],
  ['adebinkpechouhoud45@gmail.com', 'Pro'],
  ['ahissouserge84@gmail.com', 'Basic'],
  ['dahoucarmelle9@gmail.com', 'Pro'],
  ['ryryj7@gmail.com', 'Pro'],
  ['odilonahossi655@gmail.com', 'Basic'],
  ['alanstile.nguessan@ensea.ed.ci', 'Pro'],
  ['penseechretienne@gmail.com', 'Basic'],
  ['dokoundelaurencia336@gmail.com', 'Pro'],
  ['oswaldhounkanlinkpe25@gmail.com', 'Pro'],
  ['legarreresjeandedieu@gmail.com', 'Basic'],
  ['hountonrosius7@gmail.com', 'Pro'],
  ['denonsourouingrid@gmail.com', 'Basic'],
  ['richardsonagbozo02@gmail.com', 'Pro'],
  ['linloraccessoiresenlaine@gmail.com', 'Pro'],
  ['israellawani.pro@gmail.com', 'Basic'],
  ['audreyble05@gmail.com', 'Pro'],
  ['bilalsekou175@gmail.com', 'Basic'],
];

async function fetchUserByEmail(email) {
  const url = `${SUPABASE_URL}/rest/v1/users?select=id,email,plan,subscription_status,subscription_start_date,subscription_end_date&email=eq.${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows[0] || null;
}

async function applyFix(userId, plan) {
  const now = new Date();
  const end = new Date(now.getTime() + DURATION_DAYS * 24 * 60 * 60 * 1000);
  const url = `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      plan,
      subscription_status: 'active',
      subscription_start_date: now.toISOString(),
      subscription_end_date: end.toISOString(),
      updated_at: now.toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
}

async function fetchStragglers(expectedEmails) {
  // Liste tous les users plan IN ('Basic','Pro') hors liste, où status/end_date posent problème.
  const url = `${SUPABASE_URL}/rest/v1/users?select=id,email,plan,subscription_status,subscription_end_date&plan=in.(Basic,Pro)`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  const all = await res.json();
  const expectedSet = new Set(expectedEmails.map((e) => e.toLowerCase()));
  const now = Date.now();
  return all.filter((u) => {
    if (expectedSet.has(u.email.toLowerCase())) return false;
    const noEnd = !u.subscription_end_date;
    const expired = u.subscription_end_date && new Date(u.subscription_end_date).getTime() <= now;
    const notActive = (u.subscription_status || '').toLowerCase() !== 'active';
    return noEnd || expired || notActive;
  });
}

function needsFix(user, expectedPlan) {
  if (!user) return { reason: 'NOT_FOUND', action: null };
  const actions = [];
  if (user.plan !== expectedPlan) actions.push(`plan: ${user.plan} → ${expectedPlan}`);
  if ((user.subscription_status || '').toLowerCase() !== 'active') {
    actions.push(`status: ${user.subscription_status} → active`);
  }
  if (!user.subscription_end_date) {
    actions.push(`end_date: NULL → +${DURATION_DAYS}j`);
  } else if (new Date(user.subscription_end_date).getTime() <= Date.now()) {
    actions.push(`end_date: ${user.subscription_end_date} (expirée) → +${DURATION_DAYS}j`);
  }
  return { reason: actions.length ? 'NEEDS_UPDATE' : 'OK', actions };
}

async function main() {
  console.log(`Mode : ${APPLY ? 'APPLY (écriture DB)' : 'DRY-RUN (lecture seule)'}`);
  console.log(`Cible : ${EXPECTED.length} comptes bootcamp\n`);

  const summary = { ok: 0, needsUpdate: 0, notFound: 0, applied: 0, errors: 0 };
  const lines = [];

  for (const [email, expectedPlan] of EXPECTED) {
    try {
      const user = await fetchUserByEmail(email);
      const { reason, actions } = needsFix(user, expectedPlan);

      if (reason === 'NOT_FOUND') {
        summary.notFound++;
        lines.push(`❌ ${email.padEnd(45)} | NON TROUVÉ (attendu: ${expectedPlan})`);
        continue;
      }
      if (reason === 'OK') {
        summary.ok++;
        lines.push(`✅ ${email.padEnd(45)} | ${user.plan} actif jusqu'au ${user.subscription_end_date?.slice(0, 10)}`);
        continue;
      }

      summary.needsUpdate++;
      lines.push(`⚠️  ${email.padEnd(45)} | ${actions.join(', ')}`);
      if (APPLY) {
        await applyFix(user.id, expectedPlan);
        summary.applied++;
        lines[lines.length - 1] += '  [FIXÉ]';
      }
    } catch (e) {
      summary.errors++;
      lines.push(`💥 ${email.padEnd(45)} | ERREUR: ${e.message}`);
    }
  }

  console.log(lines.join('\n'));
  console.log('\n--- Résumé bootcamp ---');
  console.log(`OK              : ${summary.ok}`);
  console.log(`À corriger      : ${summary.needsUpdate}`);
  console.log(`Non trouvés     : ${summary.notFound}`);
  console.log(`Erreurs         : ${summary.errors}`);
  if (APPLY) console.log(`Appliqués       : ${summary.applied}`);

  // Stragglers : autres users avec plan payant mais état incohérent
  console.log('\n--- Audit hors-liste (autres comptes Basic/Pro à problème) ---');
  const stragglers = await fetchStragglers(EXPECTED.map(([e]) => e));
  if (!stragglers.length) {
    console.log('Aucun straggler détecté ✅');
  } else {
    console.log(`${stragglers.length} compte(s) hors-liste à examiner manuellement :`);
    for (const u of stragglers) {
      console.log(
        `  - ${u.email.padEnd(45)} | plan=${u.plan} status=${u.subscription_status} end=${u.subscription_end_date || 'NULL'}`
      );
    }
    console.log('(Ce script ne les modifie PAS — vérifier au cas par cas.)');
  }
}

main().catch((e) => {
  console.error('FATAL :', e);
  process.exit(1);
});
