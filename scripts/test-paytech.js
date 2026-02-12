/**
 * Script de test PayTech
 * Vérifie que la configuration est correcte
 * 
 * Usage: node scripts/test-paytech.js
 */

const https = require('https');

// Configuration (utilisez vos vraies clés)
const PAYTECH_CONFIG = {
  API_KEY: '4b493d8b54503e3c4fa25fd747c6267080cd5b696ff53bed6cb48f4806821271',
  API_SECRET: '93405fbc4cc2beda2107a92f888bf18168b93cababb900ed8cc8466d87526bfa',
  BASE_URL: 'paytech.sn',
};

// Données de test
const paymentData = {
  item_name: 'Test Abonnement Big Five',
  item_price: 4500,
  currency: 'XOF',
  ref_command: 'TEST_' + Date.now(),
  command_name: 'Test paiement abonnement',
  env: 'test',
  ipn_url: 'https://example.com/ipn',
  success_url: 'https://example.com/success',
  cancel_url: 'https://example.com/cancel',
};

console.log('🧪 Test de la configuration PayTech...\n');
console.log('📋 Configuration:');
console.log('  - API_KEY:', PAYTECH_CONFIG.API_KEY.substring(0, 20) + '...');
console.log('  - API_SECRET:', PAYTECH_CONFIG.API_SECRET.substring(0, 20) + '...');
console.log('  - BASE_URL:', PAYTECH_CONFIG.BASE_URL);
console.log('  - ENV: test\n');

console.log('💳 Données de paiement:');
console.log('  - item_name:', paymentData.item_name);
console.log('  - item_price:', paymentData.item_price);
console.log('  - ref_command:', paymentData.ref_command);
console.log('  - currency:', paymentData.currency);
console.log('\n🚀 Envoi de la requête...\n');

const data = JSON.stringify(paymentData);

const options = {
  hostname: PAYTECH_CONFIG.BASE_URL,
  path: '/api/payment/request-payment',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'API_KEY': PAYTECH_CONFIG.API_KEY,
    'API_SECRET': PAYTECH_CONFIG.API_SECRET,
  },
};

const req = https.request(options, (res) => {
  let responseData = '';

  console.log('📥 Statut HTTP:', res.statusCode);
  console.log('📥 Headers:', JSON.stringify(res.headers, null, 2));
  console.log('');

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      
      console.log('✅ Réponse reçue:\n');
      console.log(JSON.stringify(result, null, 2));
      console.log('\n');

      if (result.success === 1) {
        console.log('✅ SUCCESS! PayTech est correctement configuré!');
        console.log('\n🔗 URL de redirection:', result.redirect_url || result.redirectUrl);
        console.log('🎫 Token:', result.token);
      } else {
        console.log('❌ ERREUR:', result.message || 'Échec de la requête');
      }
    } catch (error) {
      console.log('❌ ERREUR de parsing JSON:', error.message);
      console.log('📄 Réponse brute:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ ERREUR de requête:', error.message);
});

req.write(data);
req.end();
