/**
 * Script de diagnostic pour l'erreur 500 sur /api/payment/subscribe
 * 
 * Exécution : node scripts/diagnose-payment-error.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes !');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 Diagnostic de l\'erreur de paiement...\n');

  // 1. Vérifier la connexion Supabase
  console.log('1️⃣ Test de connexion Supabase...');
  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('   ✅ Connexion Supabase OK\n');
  } catch (error) {
    console.error('   ❌ Erreur connexion Supabase:', error.message);
    return;
  }

  // 2. Vérifier l'existence de la table payments
  console.log('2️⃣ Vérification de la table payments...');
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.error('   ❌ Table payments n\'existe pas !');
        console.log('   💡 Solution: Exécutez le script scripts/fix-payments-table-v2.sql dans Supabase SQL Editor\n');
        return;
      }
      throw error;
    }
    console.log('   ✅ Table payments existe\n');
  } catch (error) {
    console.error('   ❌ Erreur:', error.message, '\n');
    return;
  }

  // 3. Vérifier les colonnes de la table payments
  console.log('3️⃣ Vérification des colonnes...');
  const requiredColumns = [
    'id', 'user_email', 'amount', 'status', 'payment_method', 
    'ref_command', 'metadata', 'created_at'
  ];
  
  try {
    // Tester en insérant puis supprimant un paiement test
    const testPayment = {
      user_email: 'test@example.com',
      amount: 25000,
      status: 'pending',
      payment_method: 'Test',
      ref_command: `TEST-${Date.now()}`,
      metadata: { test: true }
    };

    const { data, error } = await supabase
      .from('payments')
      .insert(testPayment)
      .select()
      .single();

    if (error) {
      console.error('   ❌ Erreur insertion test:', error.message);
      console.error('   Détails:', error);
      console.log('\n   💡 La table existe mais il manque des colonnes ou il y a des contraintes invalides');
      console.log('   💡 Solution: Exécutez le script scripts/fix-payments-table-v2.sql\n');
      return;
    }

    // Supprimer le paiement test
    await supabase.from('payments').delete().eq('id', data.id);
    
    console.log('   ✅ Toutes les colonnes requises sont présentes\n');
  } catch (error) {
    console.error('   ❌ Erreur:', error.message, '\n');
    return;
  }

  // 4. Vérifier la table users
  console.log('4️⃣ Vérification de la table users...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, subscription_status')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = pas de résultats (table vide)
      throw error;
    }
    
    console.log('   ✅ Table users OK');
    if (data) {
      console.log(`   📧 Utilisateur trouvé: ${data.email}\n`);
    } else {
      console.log('   ⚠️  Aucun utilisateur dans la base (table vide)\n');
    }
  } catch (error) {
    console.error('   ❌ Erreur:', error.message, '\n');
    return;
  }

  // 5. Vérifier les variables PayTech
  console.log('5️⃣ Vérification des variables PayTech...');
  const paytechKey = process.env.PAYTECH_API_KEY;
  const paytechSecret = process.env.PAYTECH_API_SECRET;
  const paytechEnv = process.env.PAYTECH_ENV || 'test';
  
  console.log('   PAYTECH_API_KEY:', paytechKey ? `✓ (${paytechKey.substring(0, 10)}...)` : '✗ MANQUANT');
  console.log('   PAYTECH_API_SECRET:', paytechSecret ? `✓ (${paytechSecret.substring(0, 10)}...)` : '✗ MANQUANT');
  console.log('   PAYTECH_ENV:', paytechEnv);
  
  if (!paytechKey || !paytechSecret) {
    console.log('\n   ⚠️  Variables PayTech manquantes dans .env.local\n');
  } else {
    console.log('   ✅ Variables PayTech configurées\n');
  }

  // 6. Simulation d'insertion
  console.log('6️⃣ Test d\'insertion de paiement...');
  try {
    const testUser = await supabase
      .from('users')
      .select('id, email')
      .limit(1)
      .single();

    if (!testUser.data) {
      console.log('   ⚠️  Aucun utilisateur pour tester. Créez un compte d\'abord.\n');
    } else {
      const testPayment = {
        user_email: testUser.data.email,
        amount: 25000,
        status: 'pending',
        payment_method: 'Orange Money',
        ref_command: `DIAG-${Date.now()}`,
        metadata: {
          type: 'subscription',
          duration_days: 30,
          userId: testUser.data.id,
        }
      };

      const { data, error } = await supabase
        .from('payments')
        .insert(testPayment)
        .select()
        .single();

      if (error) {
        console.error('   ❌ Erreur insertion:', error.message);
        console.error('   Code:', error.code);
        console.error('   Détails:', error.details);
        console.error('   Hint:', error.hint, '\n');
        return;
      }

      console.log('   ✅ Paiement test créé avec succès');
      console.log('   ID:', data.id);
      
      // Nettoyer
      await supabase.from('payments').delete().eq('id', data.id);
      console.log('   🧹 Paiement test supprimé\n');
    }
  } catch (error) {
    console.error('   ❌ Erreur:', error.message, '\n');
  }

  // Résumé
  console.log('=' .repeat(50));
  console.log('✅ DIAGNOSTIC TERMINÉ');
  console.log('=' .repeat(50));
  console.log('\n💡 Si toutes les vérifications sont OK, l\'erreur 500 devrait être résolue.');
  console.log('💡 Sinon, suivez les instructions dans FIX_ERROR_500.md\n');
}

diagnose().catch(console.error);
