export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { CHARIOW_CONFIG } from '@/lib/chariow';

/**
 * Endpoint de diagnostic pour vérifier la configuration Chariow.
 * ⚠️ NE PAS exposer les clés en production — on affiche seulement un résumé.
 *
 * Usage : GET /api/payment/debug
 */
export async function GET() {
  const hasApiKey = !!process.env.CHARIOW_API_KEY;
  const hasProductId = !!process.env.CHARIOW_PRODUCT_ID;
  const apiKeyPrefix = hasApiKey
    ? process.env.CHARIOW_API_KEY!.substring(0, 8) + '…'
    : '(vide)';
  const productId = hasProductId
    ? process.env.CHARIOW_PRODUCT_ID
    : '(vide)';

  // Tenter un appel réel à l'API Chariow
  let apiTest: Record<string, unknown> = { status: 'skipped' };

  if (hasApiKey && hasProductId) {
    try {
      const url = `https://api.chariow.com/v1/products/${productId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.CHARIOW_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const body = await response.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = body.substring(0, 500);
      }

      apiTest = {
        status: response.status,
        ok: response.ok,
        body: parsed,
      };
    } catch (error) {
      apiTest = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    config: {
      CHARIOW_API_KEY: hasApiKey ? `✅ Présente (${apiKeyPrefix})` : '❌ Manquante',
      CHARIOW_PRODUCT_ID: hasProductId ? `✅ ${productId}` : '❌ Manquant',
      BASE_URL: 'https://api.chariow.com/v1',
    },
    apiTest,
    hint: !hasApiKey
      ? 'Ajouter CHARIOW_API_KEY dans les variables d\'environnement Vercel'
      : !hasProductId
        ? 'Ajouter CHARIOW_PRODUCT_ID dans les variables d\'environnement Vercel'
        : apiTest.ok
          ? 'La connexion Chariow fonctionne ✅'
          : 'La clé API ou le Product ID semble invalide — vérifier sur https://chariow.dev',
  });
}
