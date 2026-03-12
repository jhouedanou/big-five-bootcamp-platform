export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getProduct, formatPrice, getSubscriptionProductId } from '@/lib/chariow';
import { PRICING_MONTHLY_VALUE } from '@/lib/constants';

// Cache en mémoire (5 minutes)
let cachedProduct: { price: number; formatted: string; currency: string; name: string } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function GET() {
  try {
    const now = Date.now();
    if (cachedProduct && now - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json(cachedProduct);
    }

    const productId = getSubscriptionProductId();
    const product = await getProduct(productId);

    const pricing = product.data.pricing;
    const rawPrice = pricing?.current_price?.value ?? pricing?.price?.value;
    const price = rawPrice != null ? Math.round(rawPrice) : null;
    const currency = pricing?.current_price?.currency ?? pricing?.price?.currency ?? 'XOF';

    if (price == null) {
      throw new Error('No price in product response');
    }

    cachedProduct = {
      price,
      formatted: `${formatPrice(price)} ${currency}`,
      currency,
      name: product.data.name,
    };
    cacheTimestamp = now;

    return NextResponse.json(cachedProduct);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error fetching product price:', errMsg);
    console.error('  → CHARIOW_API_KEY set:', !!process.env.CHARIOW_API_KEY);
    console.error('  → CHARIOW_PRODUCT_ID set:', !!process.env.CHARIOW_PRODUCT_ID);
    // Fallback sur la valeur hardcodée
    return NextResponse.json({
      price: PRICING_MONTHLY_VALUE,
      formatted: `${formatPrice(PRICING_MONTHLY_VALUE)} XOF`,
      currency: 'XOF',
      name: 'Abonnement Big Five',
      _fallback: true,
      _error: errMsg,
    });
  }
}
