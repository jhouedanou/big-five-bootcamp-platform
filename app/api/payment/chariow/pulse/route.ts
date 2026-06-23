/**
 * Webhook (Pulse) Chariow — endpoint de compatibilité.
 *
 * URL : POST /api/payment/chariow/pulse
 *
 * Cet endpoint est un ALIAS de la route canonique /api/webhook/chariow afin de
 * rester compatible avec une éventuelle configuration Chariow qui pointerait
 * encore ici. Il délègue intégralement au handler canonique pour qu'aucun
 * comportement ne puisse diverger (vérification de signature, usage des colonnes,
 * mapping des statuts, gestion successful/abandoned/failed.sale, activation
 * abonnement + brand_request).
 *
 * À terme : ne déclarer qu'UNE seule URL de Pulse dans Chariow
 * (/api/webhook/chariow) et supprimer cet alias.
 */

export { POST, GET } from '@/app/api/webhook/chariow/route'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
