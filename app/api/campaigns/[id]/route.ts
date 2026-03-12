export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/campaigns/[id]
 * Récupérer une campagne par son ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Dans Next.js 15+, params est une Promise
    const { id } = await params;
    
    const { data, error } = await (supabaseAdmin as any)
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching campaign:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 404 }
    )
  }
}

/**
 * PATCH /api/campaigns/[id]
 * Mettre à jour une campagne
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Dans Next.js 15+, params est une Promise
    const { id } = await params;
    const body = await request.json()

    const { data, error } = await (supabaseAdmin as any)
      .from('campaigns')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/campaigns/[id]
 * Supprimer une campagne
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Dans Next.js 15+, params est une Promise
    const { id } = await params;
    
    const { error } = await (supabaseAdmin as any)
      .from('campaigns')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
