
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'
    const type = searchParams.get('type') // recovery, signup, invite, etc.

    if (code) {
        const cookieStore = await cookies()

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
            if (type === 'recovery' || next.includes('update-password')) {
                redirectUrl = `${origin}/update-password`
            }

            // Créer la réponse de redirection AVEC les cookies de session
            const response = NextResponse.redirect(redirectUrl)
            cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options)
            })
            return response
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
