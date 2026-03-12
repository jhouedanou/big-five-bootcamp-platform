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

    const price = product.data.current_price?.value ?? product.data.price?.value;
    const currency = product.data.current_price?.currency ?? product.data.price?.currency ?? 'XOF';

    cachedProduct = {
      price,
      formatted: `${formatPrice(price)} ${currency}`,
      currency,
      name: product.data.name,
    };
    cacheTimestamp = now;

    return NextResponse.json(cachedProduct);
  } catch (error) {
    console.error('Error fetching product price:', error);
    // Fallback sur la valeur hardcodée
    return NextResponse.json({
      price: PRICING_MONTHLY_VALUE,
      formatted: `${formatPrice(PRICING_MONTHLY_VALUE)} XOF`,
      currency: 'XOF',
      name: 'Abonnement Big Five',
    });
  }
}
