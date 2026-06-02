import { NextRequest, NextResponse } from 'next/server'
import { validateLicense } from '@/lib/chariow'

export async function POST(request: NextRequest) {
  try {
    const { licenseKey } = await request.json()
    if (!licenseKey || typeof licenseKey !== 'string') {
      return NextResponse.json({ valid: false, error: 'licenseKey requis' }, { status: 400 })
    }
    const result = await validateLicense(licenseKey.trim())
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json(
      { valid: false, error: e?.message || 'Erreur validation licence' },
      { status: 500 }
    )
  }
}
