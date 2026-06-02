import { NextRequest, NextResponse } from 'next/server'
import { activateLicense } from '@/lib/chariow'

export async function POST(request: NextRequest) {
  try {
    const { licenseKey, deviceIdentifier } = await request.json()
    if (!licenseKey || !deviceIdentifier) {
      return NextResponse.json(
        { error: 'licenseKey et deviceIdentifier requis' },
        { status: 400 }
      )
    }
    const license = await activateLicense(String(licenseKey).trim(), String(deviceIdentifier))
    return NextResponse.json({ success: true, license })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Erreur activation licence' },
      { status: 500 }
    )
  }
}
