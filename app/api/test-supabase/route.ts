export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error, count } = await supabase
      .from('campaigns')
      .select('id, title', { count: 'exact' })
      .limit(5)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Connexion Supabase reussie!',
      stats: {
        total_campaigns: count,
        sample_campaigns: data
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      help: 'Verifiez que le schema SQL a ete execute dans Supabase Dashboard'
    }, { status: 500 })
  }
}
