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
      console.log('💰 Product price (cached):', cachedProduct);
      return NextResponse.json(cachedProduct);
    }

    const productId = getSubscriptionProductId();
    console.log('💰 Fetching product price from Chariow, productId:', productId);
    const product = await getProduct(productId);
    console.log('💰 Chariow product response:', JSON.stringify(product.data, null, 2));

    const pricing = product.data.pricing;
    const price = pricing?.current_price?.value ?? pricing?.price?.value;
    const currency = pricing?.current_price?.currency ?? pricing?.price?.currency ?? 'XOF';

    if (price == null) {
      console.warn('⚠️ No price found in Chariow response, using fallback');
      throw new Error('No price in product response');
    }

    cachedProduct = {
      price,
      formatted: `${formatPrice(price)} ${currency}`,
      currency,
      name: product.data.name,
    };
    cacheTimestamp = now;

    console.log('💰 Product price fetched:', cachedProduct);
    return NextResponse.json(cachedProduct);
  } catch (error) {
    console.error('❌ Error fetching product price:', error);
    // Fallback sur la valeur hardcodée
    return NextResponse.json({
      price: PRICING_MONTHLY_VALUE,
      formatted: `${formatPrice(PRICING_MONTHLY_VALUE)} XOF`,
      currency: 'XOF',
      name: 'Abonnement Big Five',
      _fallback: true,
    });
  }
}
