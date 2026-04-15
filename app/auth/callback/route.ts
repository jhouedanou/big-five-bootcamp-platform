
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'
    const type = searchParams.get('type') // recovery, signup, invite, etc.
    const cookieStore = await cookies()

    // Détecter le flux de récupération de mot de passe via le cookie
    // (fallback car les query params peuvent être perdus lors du redirect Supabase)
    const hasRecoveryCookie = cookieStore.get('sb-password-recovery')?.value === 'true'
    const isRecoveryFlow = type === 'recovery' || next.includes('update-password') || hasRecoveryCookie

    if (code) {
        // Collecter les cookies à écrire sur la réponse de redirection
        const cookiesToSet: { name: string; value: string; options: any }[] = []

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookies) {
                        cookies.forEach(({ name, value, options }) => {
                            cookiesToSet.push({ name, value, options })
                        })
                    },
                },
            }
        )

        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.session) {
            // Auto-créer le profil dans public.users si manquant
            try {
                const user = data.session.user
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

            // Déterminer l'URL de redirection
            let redirectUrl = `${origin}${next}`
            if (isRecoveryFlow) {
                redirectUrl = `${origin}/update-password`
            }

            // Créer la réponse de redirection AVEC les cookies de session
            const response = NextResponse.redirect(redirectUrl)
            cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options)
            })
            // Supprimer le cookie de récupération
            if (hasRecoveryCookie) {
                response.cookies.set('sb-password-recovery', '', { maxAge: 0, path: '/' })
            }
            return response
        } else {
            console.error('Auth callback error:', error)
        }
    }

    // Pas de code mais cookie de récupération = flux implicite (hash fragment)
    // Rediriger vers /update-password qui gère l'auth côté client
    if (!code && isRecoveryFlow) {
        const response = NextResponse.redirect(`${origin}/update-password`)
        response.cookies.set('sb-password-recovery', '', { maxAge: 0, path: '/' })
        return response
    }

    // Rediriger vers la page d'erreur avec des détails
    const errorUrl = new URL(`${origin}/auth/auth-code-error`)
    if (!code) {
        errorUrl.searchParams.set('reason', 'missing_code')
    } else {
        errorUrl.searchParams.set('reason', 'exchange_failed')
    }
    // Transmettre les paramètres d'erreur de Supabase s'ils existent
    const error_description = searchParams.get('error_description')
    if (error_description) {
        errorUrl.searchParams.set('error_description', error_description)
    }
    return NextResponse.redirect(errorUrl)
}
