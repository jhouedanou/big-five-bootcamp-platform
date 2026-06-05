
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  MAX_SESSIONS_PER_USER,
  getSessionIdFromAccessToken,
  listActiveSessions,
} from '@/lib/sessions'

// Cache cookie : si l'utilisateur a été vérifié récemment (et qu'il est dans
// la fenêtre des 3 sessions les plus récentes), on évite un appel DB sur
// chaque navigation. Le cookie est invalidé naturellement à expiration.
const DEVICE_CHECK_COOKIE = 'lvy-dev-ok'
const DEVICE_CHECK_TTL_SECONDS = 60

function shouldEnforceDeviceLimit(pathname: string): boolean {
  // On bloque l'accès aux espaces authentifiés. Pas sur les pages publiques,
  // ni sur la page /auth/device-limit (sinon boucle), ni sur /admin (les admins
  // ne sont pas concernés par la limite).
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/favorites') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/subscribe')
  )
}

export async function updateSession(request: NextRequest) {
    // Supabase redirige les erreurs d'auth (OTP expiré, lien invalide)
    // vers le SITE_URL avec ?error=...&error_code=...&error_description=...
    // On intercepte ici pour rediriger vers la page d'erreur dédiée
    const error = request.nextUrl.searchParams.get('error')
    const errorCode = request.nextUrl.searchParams.get('error_code')
    const errorDescription = request.nextUrl.searchParams.get('error_description')

    if (request.nextUrl.pathname === '/' && error && (errorCode || errorDescription)) {
        const errorUrl = request.nextUrl.clone()
        errorUrl.pathname = '/auth/auth-code-error'
        errorUrl.search = ''
        if (error) errorUrl.searchParams.set('error', error)
        if (errorCode) errorUrl.searchParams.set('error_code', errorCode)
        if (errorDescription) errorUrl.searchParams.set('error_description', errorDescription)
        return NextResponse.redirect(errorUrl)
    }

    // Sur la home sans erreur Supabase, pas besoin de valider la session
    // côté middleware → on évite un appel getUser() à chaque navigation.
    if (request.nextUrl.pathname === '/') {
        return NextResponse.next({
            request: { headers: request.headers },
        })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Si la config Supabase n'est pas disponible (mauvaise config env en prod),
    // ne pas casser toute la navigation avec un 500 côté middleware.
    if (!supabaseUrl || !supabaseAnonKey) {
        return NextResponse.next({
            request: { headers: request.headers },
        })
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // Routes accessibles aux visiteurs anonymes même sous /dashboard.
    // Permet de remplir une demande de veille concurrentielle (ou de souscrire)
    // sans compte ; la page elle-même demande l'authentification uniquement
    // au moment de la validation finale (cf. app/dashboard/brand-requests/page.tsx
    // — gate `authPromptOpen` + brouillon en sessionStorage).
    const PUBLIC_DASHBOARD_PATHS = [
        '/dashboard/brand-requests',
    ]
    const isPublicDashboardPath = PUBLIC_DASHBOARD_PATHS.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
    )

    // Protected routes - require authentication
    const isProtectedAppRoute =
        (pathname.startsWith('/dashboard') && !isPublicDashboardPath) ||
        pathname.startsWith('/favorites') ||
        pathname.startsWith('/profile') ||
        pathname.startsWith('/subscribe')

    if (isProtectedAppRoute) {
        if (!user) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('redirect', pathname)
            return NextResponse.redirect(url)
        }

        // Onboarding obligatoire : tant que le profil n'est pas complété,
        // bloquer l'accès aux routes protégées et rediriger vers /onboarding.
        // (Le client SPA affiche en plus une modal bloquante via
        //  RequireCompletedProfile pour les navigations sans rechargement.)
        const { data: profile } = await supabase
            .from('profiles')
            .select('profile_completed')
            .eq('user_id', user.id)
            .maybeSingle()

        if (!profile?.profile_completed) {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding'
            url.search = ''
            return NextResponse.redirect(url)
        }
    }

    // Admin routes - redirect to admin login
    if (pathname.startsWith('/admin') &&
        !pathname.startsWith('/admin/login')) {

        if (!user) {
            const url = request.nextUrl.clone()
            url.pathname = '/admin/login'
            return NextResponse.redirect(url)
        }
    }

    // Auth routes (redirect if already logged in)
    if (pathname.startsWith('/login') ||
        pathname.startsWith('/register')) {

        if (user) {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    }

    // Enforcement de la limite multi-appareils (hard block).
    // Skip si pas connecté, si pas une route concernée, ou si le cookie cache
    // confirme une vérif récente.
    if (
      user &&
      shouldEnforceDeviceLimit(pathname) &&
      !request.cookies.has(DEVICE_CHECK_COOKIE)
    ) {
      try {
        // getSession() lit le JWT depuis les cookies sans round-trip Auth.
        const { data: { session } } = await supabase.auth.getSession()
        const currentSessionId = getSessionIdFromAccessToken(session?.access_token)

        if (currentSessionId) {
          const topSessions = await listActiveSessions(user.id, MAX_SESSIONS_PER_USER + 1)

          if (topSessions.length <= MAX_SESSIONS_PER_USER) {
            response.cookies.set(DEVICE_CHECK_COOKIE, '1', {
              maxAge: DEVICE_CHECK_TTL_SECONDS,
              httpOnly: true,
              sameSite: 'lax',
              path: '/',
            })
          } else {
            const allowedIds = topSessions
              .slice(0, MAX_SESSIONS_PER_USER)
              .map((s) => s.id)

            if (allowedIds.includes(currentSessionId)) {
              response.cookies.set(DEVICE_CHECK_COOKIE, '1', {
                maxAge: DEVICE_CHECK_TTL_SECONDS,
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
              })
            } else {
              const url = request.nextUrl.clone()
              url.pathname = '/auth/device-limit'
              url.search = ''
              return NextResponse.redirect(url)
            }
          }
        }
      } catch (err) {
        // Non bloquant : si Supabase est indisponible on laisse passer pour
        // ne pas casser toute la navigation. Le post-login check rattrape.
        console.error('[device-limit] middleware check failed:', err)
      }
    }

    return response
}

