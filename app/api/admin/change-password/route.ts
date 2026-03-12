export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getAuthenticatedUser } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est authentifié et admin
    const authUser = await getAuthenticatedUser()
    if (!authUser || !authUser.isAdmin) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Mot de passe actuel et nouveau mot de passe requis' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      )
    }

    // Vérifier le mot de passe actuel en tentant une connexion
    const admin = getSupabaseAdmin()
    const { error: signInError } = await admin.auth.signInWithPassword({
      email: authUser.email!,
      password: currentPassword,
    })

    if (signInError) {
      return NextResponse.json(
        { error: 'Mot de passe actuel incorrect' },
        { status: 400 }
      )
    }

    // Changer le mot de passe via l'API admin
    const { error: updateError } = await admin.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    )

    if (updateError) {
      return NextResponse.json(
        { error: 'Erreur lors du changement de mot de passe' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Mot de passe modifié avec succès' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
