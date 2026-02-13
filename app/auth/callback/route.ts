
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'
    const type = searchParams.get('type') // recovery, signup, invite, etc.

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (!error && data.session) {
            // Auto-créer le profil dans public.users si manquant
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const admin = getSupabaseAdmin()
                    const { data: existing } = await admin
                        .from('users')
                        .select('id')
                        .eq('id', user.id)
                        .single()

                    if (!existing) {
                        await admin.from('users').upsert({
                            id: user.id,
                            email: user.email!,
                            name: user.user_metadata?.name || user.email!.split('@')[0],
                            role: 'user',
                            plan: 'Free',
                            status: 'active',
                        }, { onConflict: 'id' })
                    }
                }
            } catch (e) {
                console.error('Auto-profile creation error:', e)
            }

            // Si c'est une réinitialisation de mot de passe, forcer la redirection vers update-password
            if (type === 'recovery' || next.includes('update-password')) {
                return NextResponse.redirect(`${origin}/update-password`)
            }

            return NextResponse.redirect(`${origin}${next}`)
        } else {
            console.error('Auth callback error:', error)
        }
    }

    // Rediriger vers la page d'erreur avec des détails
    const errorUrl = new URL(`${origin}/auth/auth-code-error`)
    if (!code) {
        errorUrl.searchParams.set('reason', 'missing_code')
    }
    return NextResponse.redirect(errorUrl)
}
