export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from '@supabase/supabase-js'
import { isDisposableEmail } from '@/lib/disposable-emails'
import { resolveCampaignSignup, buildCampaignSubscriptionFields, recordCampaignSignupAudit } from '@/lib/campaign'

// Liste des codes pays acceptés à l'inscription. Doit rester aligné avec
// `PHONE_COUNTRIES` dans `components/phone-input.tsx`.
const PHONE_COUNTRY_CODES = ['CIV', 'SEN', 'BEN', 'CMR', 'BFA', 'TGO', 'MLI', 'FRA'] as const

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  website: z.string().optional(),
  phoneCountry: z.enum(PHONE_COUNTRY_CODES, {
    errorMap: () => ({ message: "Indicatif pays invalide" }),
  }),
  phoneE164: z
    .string()
    .regex(/^\+[1-9][0-9]{5,14}$/, "Numéro de téléphone invalide"),
  elapsedMs: z.number().optional(),
  // Destination après confirmation d'email (ex: /webinaires?session=slug,
  // /subscribe?plan=pro). Chemin interne uniquement — validé ci-dessous.
  redirect: z.string().max(500).optional(),
  // event_id pixel Facebook pour le dédoublonnage CAPI (LOT F).
  fbEventId: z.string().max(100).optional(),
})

/** N'accepte qu'un chemin interne ("/...", pas "//host") — anti open redirect. */
function sanitizeRedirect(redirect: string | undefined): string {
  if (!redirect) return '/dashboard'
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return '/dashboard'
  return redirect
}

// Rate limit en mémoire : max 5 tentatives par IP / 10 minutes
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 5
const MIN_FORM_TIME_MS = 1500
const ipAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = ipAttempts.get(ip)

  if (!entry || entry.resetAt < now) {
    ipAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true }
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, email, password, website, phoneCountry, phoneE164, elapsedMs, redirect, fbEventId } = validation.data

    // Refuser les domaines d'emails jetables / temporaires
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        {
          error:
            "Les adresses email jetables ne sont pas acceptées. Merci d'utiliser une adresse email personnelle ou professionnelle valide.",
        },
        { status: 400 }
      )
    }

    // Honeypot : champ "website" doit rester vide. Si rempli → bot.
    if (website && website.trim().length > 0) {
      return NextResponse.json({ message: "Compte créé avec succès" }, { status: 201 })
    }

    // Anti-bot temporel : un humain met au moins 1.5s à remplir le formulaire
    if (typeof elapsedMs === "number" && elapsedMs < MIN_FORM_TIME_MS) {
      return NextResponse.json({ message: "Compte créé avec succès" }, { status: 201 })
    }

    // Rate limiting par IP
    const remoteIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"
    const rate = checkRateLimit(remoteIp)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${rate.retryAfter}s.` },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter ?? 60) } }
      )
    }

    // ————————————————————————————————————————————————
    // Vérification anti-doublon AVANT signUp.
    // Supabase (avec "Confirm email" activé) ne renvoie PAS d'erreur si l'email
    // existe déjà (anti-énumération) — il retourne un user avec identities: [].
    // On lève donc nous-mêmes le 409 explicite via l'admin API.
    // ————————————————————————————————————————————————
    const supabaseAdminPreCheck = getSupabaseAdmin()
    const normalizedEmail = email.toLowerCase().trim()
    try {
      const { data: existingByProfile } = await supabaseAdminPreCheck
        .from('users')
        .select('id, email')
        .ilike('email', normalizedEmail)
        .maybeSingle()

      let existsInAuth = false
      if (!existingByProfile) {
        // listUsers permet de filtrer par email (pagination — on prend page 1 large)
        const { data: authList } = await supabaseAdminPreCheck.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        })
        existsInAuth = !!authList?.users?.some(u => (u.email || '').toLowerCase() === normalizedEmail)
      }

      if (existingByProfile || existsInAuth) {
        return NextResponse.json(
          {
            error: "Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.",
            code: "email_already_registered",
          },
          { status: 409 }
        )
      }
    } catch (preCheckErr) {
      console.error("Pre-check existing user error:", preCheckErr)
      // Non bloquant — on laisse signUp s'exécuter, la duplication sera rattrapée
      // par signUpError ou par identities.length === 0 plus bas.
    }

    // Création via supabase.auth.signUp (client anon).
    // → Supabase envoie automatiquement l'email de confirmation (si activé dans le projet).
    // → L'utilisateur n'a PAS de session tant qu'il n'a pas cliqué sur le lien.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante côté serveur" },
        { status: 500 }
      )
    }

    // URL de redirection après clic sur le lien de confirmation.
    // Priorité : NEXT_PUBLIC_APP_URL (défini en prod) > NEXT_PUBLIC_SITE_URL (legacy) > origin de la requête (dev).
    // Important : sur Vercel l'origin de la requête est le domaine de déploiement (`*.vercel.app`)
    // et pas le domaine canonique → le lien email pointerait vers un host différent et casserait la session.
    const siteUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      new URL(request.url).origin
    const emailRedirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(sanitizeRedirect(redirect))}`

    const supabaseAnon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo,
      },
    })

    if (signUpError) {
      console.error("SignUp error:", signUpError.message)
      const msg = signUpError.message.toLowerCase()
      if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
        return NextResponse.json(
          { error: "Un compte avec cet email existe déjà" },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: signUpError.message || "Erreur lors de la création du compte" },
        { status: 500 }
      )
    }

    if (!signUpData.user) {
      return NextResponse.json(
        { error: "Erreur lors de la création du compte" },
        { status: 500 }
      )
    }

    // Filet de sécurité : si Supabase renvoie un user SANS identités, c'est que
    // l'email existait déjà (comportement anti-énumération avec "Confirm email").
    if (!signUpData.user.identities || signUpData.user.identities.length === 0) {
      return NextResponse.json(
        {
          error: "Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.",
          code: "email_already_registered",
        },
        { status: 409 }
      )
    }

    // Créer le profil dans la table users via service role (bypass RLS).
    // En dehors d'une campagne active, aucun plan par défaut : le choix d'un plan PAYANT
    // (Découverte / Basic / Pro) est obligatoire pour accéder à la plateforme.
    // La campagne est pilotée depuis l'admin (site_settings) et s'ouvre/ferme
    // automatiquement selon les dates — aucune variable d'env requise.
    const supabaseAdmin = getSupabaseAdmin()
    const nowTs = new Date()

    const campaign = await resolveCampaignSignup(supabaseAdmin, nowTs)

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: signUpData.user.id,
        email,
        name,
        role: 'user',
        status: 'active',
        ...buildCampaignSubscriptionFields(campaign, nowTs),
        phone_country: phoneCountry,
        phone_e164: phoneE164,
      }, { onConflict: 'id' })

    // Trace d'audit campagne (best-effort, n'affecte pas la création du compte)
    if (campaign.active && !profileError) {
      await recordCampaignSignupAudit(supabaseAdmin, {
        userId: signUpData.user.id,
        userEmail: email,
        days: campaign.days,
        now: nowTs,
        source: 'registration',
      })
    }

    if (profileError) {
      console.error("Profile creation error:", profileError.message)
      // Non bloquant — le profil sera créé au premier login si nécessaire (auth/callback)
    }

    // Conversions API Meta : CompleteRegistration côté serveur, dédoublonné
    // avec le pixel client par event_id partagé (LOT F). Best-effort.
    try {
      const { sendFbCapiEvent } = await import('@/lib/fb-capi')
      void sendFbCapiEvent({
        eventName: 'CompleteRegistration',
        eventId: fbEventId || `reg_${signUpData.user.id}`,
        email,
        phone: phoneE164,
        clientIp: remoteIp !== 'unknown' ? remoteIp : null,
        userAgent: request.headers.get('user-agent'),
        eventSourceUrl: `${siteUrl}/register`,
      })
    } catch {
      // Le tracking ne bloque jamais l'inscription.
    }

    // Si email_confirmed_at est null, l'utilisateur doit confirmer son email.
    const needsEmailConfirmation = !signUpData.user.email_confirmed_at

    return NextResponse.json({
      message: "Compte créé avec succès",
      needsEmailConfirmation,
      user: {
        id: signUpData.user.id,
        email,
        name,
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la création du compte" },
      { status: 500 }
    )
  }
}
