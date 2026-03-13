/**
 * Chariow Payment Integration
 * 
 * Configuration et helpers pour l'intégration Chariow (widget de paiement).
 */

export const CHARIOW_CONFIG = {
  API_KEY: process.env.CHARIOW_API_KEY || '',
  PRODUCT_ID: process.env.CHARIOW_PRODUCT_ID || '',
  API_URL: 'https://api.chariow.com/v1',
};

/**
 * Génère une référence de commande unique
 */
export function generateRefCommand(prefix: string = 'CHW'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Récupère les détails d'une vente via l'API Chariow
 */
export async function getSale(saleId: string): Promise<any> {
  if (!CHARIOW_CONFIG.API_KEY) {
    throw new Error('CHARIOW_API_KEY non configurée');
  }

  const response = await fetch(`${CHARIOW_CONFIG.API_URL}/sales/${saleId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CHARIOW_CONFIG.API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chariow API error ${response.status}: ${errorText}`);
  }

  return response.json();
}
