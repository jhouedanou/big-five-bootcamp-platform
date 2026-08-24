import { getSupabaseAdmin } from '@/lib/supabase-server'
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption'
import { getPlanDisplayName } from '@/lib/pricing'

/**
 * Configuration Mailchimp stockée en BDD
 */
export interface MailchimpConfig {
  apiKey: string
  audienceId: string
  fromName: string
  fromEmail: string
  defaultTag: string
}

/**
 * Définition d'un champ de fusion (merge field) Mailchimp attendu.
 * `tag` = identifiant utilisé dans merge_fields (ex: FNAME, COMPANY).
 */
export interface MergeFieldDef {
  tag: string
  name: string
  type?:
    | 'text'
    | 'number'
    | 'phone'
    | 'date'
    | 'address'
    | 'url'
    | 'dropdown'
    | 'radio'
    | 'zip'
    | 'birthday'
    | 'imageurl'
}

/**
 * Métadonnées de la Creative Library pour les campagnes email
 */
export interface LibraryMetadata {
  totalCampaigns: number
  brands: string[]
  sectors: string[]
  axes: string[]
  countries: string[]
  period: { from: string; to: string }
  platformUrl: string
  latestCampaigns: { title: string; url: string; brand: string; sector: string }[]
  /** Contenus de la semaine = fenêtre 7 jours (= envoi hebdo). */
  weeklyCampaigns: { title: string; url: string; brand: string; sector: string; createdAt: string }[]
  /** Bornes de la fenêtre hebdo (format FR), pour l'affichage admin. */
  weekFrom: string
  weekTo: string
  recommendedSendTime: string
}

/**
 * Champs de fusion écrits par `syncUsersWithAudience`.
 *
 * Mailchimp REFUSE un contact dont les merge fields ne sont pas déclarés dans
 * l'audience : la synchronisation les crée donc si besoin, sinon elle
 * échouerait sur chaque contact avec un message peu parlant.
 */
export const SYNC_MERGE_FIELDS: MergeFieldDef[] = [
  { tag: 'FNAME', name: 'Prénom', type: 'text' },
  { tag: 'LNAME', name: 'Nom', type: 'text' },
  { tag: 'PLAN', name: 'Offre', type: 'text' },
  { tag: 'SUBSTATUS', name: 'Statut abonnement', type: 'text' },
  { tag: 'STATUS', name: 'Statut du compte', type: 'text' },
]

/**
 * Service Mailchimp — gère la configuration, le test de connexion,
 * la synchronisation des utilisateurs et l'envoi de métadonnées.
 */
export class MailchimpService {
  private config: MailchimpConfig | null = null

  /**
   * Charge la configuration Mailchimp depuis la BDD (site_settings)
   */
  async loadConfig(): Promise<MailchimpConfig> {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'mailchimp_api_key',
        'mailchimp_audience_id',
        'mailchimp_from_name',
        'mailchimp_from_email',
        'mailchimp_default_tag',
      ])

    if (error) {
      throw new Error(`Erreur chargement config Mailchimp: ${error.message}`)
    }

    const settings: Record<string, string> = {}
    data?.forEach((row: { key: string; value: string }) => {
      settings[row.key] = row.value
    })

    // Déchiffrer la clé API si elle est chiffrée.
    // Si decrypt() retourne '' alors que rawApiKey n'est pas vide, c'est que
    // le déchiffrement a échoué (clé ENCRYPTION_KEY changée/absente, données
    // corrompues) — on signalera plus tard une erreur actionnable plutôt que
    // de passer un ciphertext au validateur regex (qui produisait le
    // trompeur "Clé API Mailchimp invalide (format attendu: xxxxx-us14)").
    const rawApiKey = settings['mailchimp_api_key'] || ''
    let apiKey = ''
    if (rawApiKey) {
      if (isEncrypted(rawApiKey)) {
        apiKey = decrypt(rawApiKey) // '' si échec
      } else {
        apiKey = rawApiKey
      }
    }

    this.config = {
      apiKey,
      audienceId: settings['mailchimp_audience_id'] || '',
      fromName: settings['mailchimp_from_name'] || '',
      fromEmail: settings['mailchimp_from_email'] || '',
      defaultTag: settings['mailchimp_default_tag'] || '',
    }

    // Si une valeur chiffrée existait mais qu'on n'a pas pu la déchiffrer,
    // attacher un drapeau pour que les appelants donnent un message clair.
    if (rawApiKey && !apiKey) {
      (this.config as MailchimpConfig & { apiKeyUnreadable?: boolean }).apiKeyUnreadable = true
    }

    return this.config
  }

  /**
   * Sauvegarde la configuration Mailchimp en BDD.
   * La clé API est chiffrée avant stockage.
   */
  async saveConfig(config: MailchimpConfig): Promise<void> {
    const supabase = getSupabaseAdmin()

    // Chiffrer la clé API
    const encryptedApiKey = config.apiKey ? encrypt(config.apiKey) : ''

    const settings: Record<string, string> = {
      mailchimp_api_key: encryptedApiKey,
      mailchimp_audience_id: config.audienceId,
      mailchimp_from_name: config.fromName,
      mailchimp_from_email: config.fromEmail,
      mailchimp_default_tag: config.defaultTag,
    }

    const updates = Object.entries(settings).map(async ([key, value]) => {
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )
      if (error) throw new Error(`Erreur sauvegarde ${key}: ${error.message}`)
    })

    await Promise.all(updates)
  }

  /**
   * Extrait le data center depuis la clé API Mailchimp.
   * Format clé : xxxx-us21 → data center = us21
   */
  private getDataCenter(apiKey: string): string {
    const normalized = apiKey.trim()
    const match = normalized.match(/-([a-z]{2}\d{1,3})$/i)
    if (!match) {
      throw new Error('Clé API Mailchimp invalide (format attendu: xxxxx-us14)')
    }
    return match[1].toLowerCase()
  }

  /**
   * Teste la connexion à l'API Mailchimp avec la clé API fournie.
   * Retourne les informations du compte si succès.
   */
  async testConnection(apiKey?: string): Promise<{
    success: boolean
    accountName?: string
    email?: string
    error?: string
  }> {
    const key = apiKey || this.config?.apiKey
    if (!key) {
      return { success: false, error: 'Clé API non configurée' }
    }

    try {
      const dc = this.getDataCenter(key)
      const url = `https://${dc}.api.mailchimp.com/3.0/`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `apikey ${key}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.detail || `Erreur HTTP ${response.status}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        accountName: data.account_name,
        email: data.email,
      }
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Impossible de contacter l\'API Mailchimp',
      }
    }
  }

  /**
   * Récupère les métadonnées de la Creative Library pour les inclure
   * dans les campagnes email Mailchimp.
   */
  async getLibraryMetadata(): Promise<LibraryMetadata> {
    const supabase = getSupabaseAdmin()

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('id, title, slug, brand, category, axe, country, created_at')
      .eq('status', 'Publié')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erreur récupération métadonnées: ${error.message}`)
    }

    const brands = new Set<string>()
    const sectors = new Set<string>()
    const axes = new Set<string>()
    const countries = new Set<string>()
    let minDate = ''
    let maxDate = ''

    campaigns?.forEach((c: any) => {
      if (c.brand) brands.add(c.brand)
      if (c.category) sectors.add(c.category)
      if (c.country) countries.add(c.country)
      if (Array.isArray(c.axe)) {
        c.axe.forEach((a: string) => axes.add(a))
      }
      if (c.created_at) {
        if (!minDate || c.created_at < minDate) minDate = c.created_at
        if (!maxDate || c.created_at > maxDate) maxDate = c.created_at
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://bigfive.solutions')

    // Construire les liens vers les dernières campagnes ajoutées
    const toEntry = (c: any) => ({
      title: c.title || 'Sans titre',
      url: `${baseUrl}/content/${c.slug || c.id}`,
      brand: c.brand || '-',
      sector: c.category || '-',
    })
    const latestCampaigns = (campaigns || []).slice(0, 5).map(toEntry)

    // Contenus de la semaine : fenêtre de 7 jours ANCRÉE sur le contenu le plus
    // récent (maxDate), pas sur l'horloge. En prod le contenu est ajouté chaque
    // semaine → maxDate ≈ maintenant → fenêtre = celle de l'envoi hebdo
    // (cf. app/api/cron/weekly-email). Sur données plus anciennes (démo), on
    // affiche quand même la dernière semaine réelle de contenu au lieu d'une
    // liste vide. Liste COMPLÈTE (paginée côté admin).
    const anchorMs = maxDate ? new Date(maxDate).getTime() : Date.now()
    const windowStart = new Date(anchorMs - 7 * 24 * 60 * 60 * 1000)
    const weeklyCampaigns = (campaigns || [])
      .filter((c: any) => c.created_at && new Date(c.created_at) >= windowStart)
      .map((c: any) => ({ ...toEntry(c), createdAt: c.created_at }))

    return {
      totalCampaigns: campaigns?.length || 0,
      brands: Array.from(brands).sort(),
      sectors: Array.from(sectors).sort(),
      axes: Array.from(axes).sort(),
      countries: Array.from(countries).sort(),
      period: {
        from: minDate ? new Date(minDate).toLocaleDateString('fr-FR') : '-',
        to: maxDate ? new Date(maxDate).toLocaleDateString('fr-FR') : '-',
      },
      platformUrl: baseUrl,
      latestCampaigns,
      weeklyCampaigns,
      weekFrom: windowStart.toLocaleDateString('fr-FR'),
      weekTo: new Date(anchorMs).toLocaleDateString('fr-FR'),
      recommendedSendTime: 'Lundi à 08:00 (les contenus sont chargés le week-end)',
    }
  }

  /**
   * Synchronise les utilisateurs inscrits avec l'audience Mailchimp.
   * Ajoute ou met à jour les contacts dans la liste.
   */
  async syncUsersWithAudience(): Promise<{
    success: boolean
    synced: number
    errors: string[]
  }> {
    if (!this.config) await this.loadConfig()
    const config = this.config!

    const unreadable = (config as MailchimpConfig & { apiKeyUnreadable?: boolean }).apiKeyUnreadable
    if (unreadable) {
      return {
        success: false,
        synced: 0,
        errors: [
          'La clé API Mailchimp stockée est illisible (probablement chiffrée avec une clé ENCRYPTION_KEY différente). Veuillez la resaisir dans Paramètres → Mailchimp puis cliquer sur Enregistrer.',
        ],
      }
    }

    if (!config.apiKey || !config.audienceId) {
      return { success: false, synced: 0, errors: ['Configuration Mailchimp incomplète'] }
    }

    // Les champs doivent exister AVANT le premier contact envoyé, sinon
    // Mailchimp rejette toute la synchronisation.
    const fields = await this.ensureMergeFields(SYNC_MERGE_FIELDS, { create: true })
    if (!fields.ok) {
      return { success: false, synced: 0, errors: [fields.error] }
    }
    if (fields.createErrors.length) {
      return {
        success: false,
        synced: 0,
        errors: fields.createErrors.map((e) => `Champ ${e.tag} : ${e.error}`),
      }
    }

    const supabase = getSupabaseAdmin()
    const { data: users, error } = await supabase
      .from('users')
      .select('email, name, plan, status, subscription_status, email_unsubscribed')

    if (error) {
      return { success: false, synced: 0, errors: [`Erreur récupération utilisateurs: ${error.message}`] }
    }

    let baseUrl = ''
    try {
      const dc = this.getDataCenter(config.apiKey)
      baseUrl = `https://${dc}.api.mailchimp.com/3.0`
    } catch (err: any) {
      return {
        success: false,
        synced: 0,
        errors: [err?.message || 'Configuration Mailchimp invalide'],
      }
    }
    const errors: string[] = []
    let synced = 0

    for (const user of (users || [])) {
      if (!user.email) continue

      try {
        // Utiliser l'opération batch/upsert de Mailchimp
        const subscriberHash = await this.md5(user.email.toLowerCase())
        const url = `${baseUrl}/lists/${config.audienceId}/members/${subscriberHash}`

        // `subscription_status` était lu depuis la base mais jamais transmis :
        // impossible de construire un segment « abonnés actifs » côté
        // Mailchimp, alors que c'est exactement l'audience de l'alerte hebdo.
        const body: any = {
          email_address: user.email,
          status_if_new: 'subscribed',
          merge_fields: {
            FNAME: user.name?.split(' ')[0] || '',
            LNAME: user.name?.split(' ').slice(1).join(' ') || '',
            PLAN: getPlanDisplayName(user.plan),
            SUBSTATUS: user.subscription_status || 'none',
            // Statut du COMPTE, distinct de celui de l'abonnement : un compte
            // suspendu peut avoir un abonnement encore actif. Sans ce champ,
            // le segment hebdomadaire l'inclurait, alors que l'ancien filtre
            // SQL l'excluait.
            STATUS: user.status || 'unknown',
          },
        }

        // Un désabonnement enregistré côté Laveiye doit se voir dans Mailchimp,
        // sinon la campagne partirait quand même. L'inverse (désabonnement
        // fait dans Mailchimp) est déjà respecté : Mailchimp n'envoie pas à un
        // membre désabonné, et une synchronisation ne le réabonne jamais —
        // `status` n'est posé QUE pour désabonner.
        if (user.email_unsubscribed === true) {
          body.status = 'unsubscribed'
        }

        // Ajouter le tag par défaut si configuré
        if (config.defaultTag) {
          body.tags = [config.defaultTag]
        }

        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            Authorization: `apikey ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (response.ok) {
          synced++
        } else {
          const errData = await response.json().catch(() => ({}))
          errors.push(`${user.email}: ${errData.detail || response.status}`)
        }
      } catch (err: any) {
        errors.push(`${user.email}: ${err.message}`)
      }
    }

    return { success: true, synced, errors }
  }

  /**
   * URL de base de l'API pour la configuration chargée.
   * Lève si la clé est absente ou mal formée — les appelants remontent
   * l'erreur telle quelle plutôt que d'échouer silencieusement.
   */
  private async apiBase(): Promise<{ baseUrl: string; config: MailchimpConfig }> {
    if (!this.config) await this.loadConfig()
    const config = this.config!
    if ((config as any).apiKeyUnreadable) {
      throw new Error(
        'La clé API Mailchimp stockée est illisible. Resaisissez-la dans Paramètres → Mailchimp.'
      )
    }
    if (!config.apiKey || !config.audienceId) {
      throw new Error('Configuration Mailchimp incomplète (clé API ou audience manquante).')
    }
    return { baseUrl: `https://${this.getDataCenter(config.apiKey)}.api.mailchimp.com/3.0`, config }
  }

  private async request(path: string, init: RequestInit = {}): Promise<any> {
    const { baseUrl, config } = await this.apiBase()
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `apikey ${config.apiKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    })
    const text = await res.text()
    const data = text ? JSON.parse(text) : {}
    if (!res.ok) {
      throw new Error(data.detail || data.title || `Mailchimp ${res.status}`)
    }
    return data
  }

  /**
   * Segment de l'alerte hebdomadaire : abonnés actifs, hors offre gratuite.
   *
   * Créé à la demande et réutilisé ensuite (Mailchimp refuse deux segments de
   * même nom). Les conditions portent sur les merge fields écrits par
   * `syncUsersWithAudience` — la synchronisation doit donc précéder l'envoi.
   *
   * Les trois conditions reproduisent exactement le filtre SQL de l'ancien
   * envoi : compte actif, abonnement actif, offre payante. Le désabonnement,
   * lui, est porté par le statut Mailchimp du membre, pas par le segment.
   *
   * ATTENTION : un segment déjà créé n'est PAS mis à jour ici. Après un
   * changement de conditions, supprimer le segment dans Mailchimp pour qu'il
   * soit recréé, ou l'ajuster à la main.
   */
  async ensureWeeklySegment(name = 'Laveiye — alertes hebdo'): Promise<{ id: number; name: string }> {
    const { config } = await this.apiBase()

    const existing = await this.request(
      `/lists/${config.audienceId}/segments?count=200&type=saved`
    )
    const found = (existing.segments || []).find((s: any) => s.name === name)
    if (found) return { id: found.id, name: found.name }

    const created = await this.request(`/lists/${config.audienceId}/segments`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        options: {
          match: 'all',
          conditions: [
            {
              condition_type: 'TextMerge',
              field: 'SUBSTATUS',
              op: 'is',
              value: 'active',
            },
            {
              condition_type: 'TextMerge',
              field: 'PLAN',
              op: 'not',
              value: getPlanDisplayName('Free'),
            },
            {
              condition_type: 'TextMerge',
              field: 'STATUS',
              op: 'is',
              value: 'active',
            },
          ],
        },
      }),
    })

    return { id: created.id, name: created.name }
  }

  /**
   * Crée une campagne régulière, y pose le HTML, puis l'envoie.
   *
   * L'alerte hebdomadaire passait par un envoi transactionnel par utilisateur.
   * Le contenu étant strictement identique pour tout le monde, une campagne
   * unique fait le même travail — et le désabonnement, les statistiques
   * d'ouverture et la conformité sont alors gérés par Mailchimp, qui est
   * l'outil d'emailing de l'équipe.
   */
  async sendCampaign(input: {
    subject: string
    title: string
    html: string
    segmentId?: number
    /** Ne pas envoyer : la campagne reste en brouillon (répétition). */
    dryRun?: boolean
  }): Promise<{ ok: true; campaignId: string; sent: boolean } | { ok: false; error: string }> {
    try {
      const { config } = await this.apiBase()

      if (!config.fromEmail || !config.fromName) {
        return {
          ok: false,
          error: "Expéditeur Mailchimp non configuré (nom et email d'envoi).",
        }
      }

      const campaign = await this.request('/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          type: 'regular',
          recipients: {
            list_id: config.audienceId,
            ...(input.segmentId ? { segment_opts: { saved_segment_id: input.segmentId } } : {}),
          },
          settings: {
            subject_line: input.subject,
            title: input.title,
            from_name: config.fromName,
            reply_to: config.fromEmail,
            auto_footer: false,
          },
        }),
      })

      await this.request(`/campaigns/${campaign.id}/content`, {
        method: 'PUT',
        body: JSON.stringify({ html: input.html }),
      })

      if (input.dryRun) {
        return { ok: true, campaignId: campaign.id, sent: false }
      }

      await this.request(`/campaigns/${campaign.id}/actions/send`, { method: 'POST' })
      return { ok: true, campaignId: campaign.id, sent: true }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Erreur Mailchimp' }
    }
  }

  /**
   * Calcule le hash MD5 d'une chaîne (utilisé par Mailchimp pour identifier les membres)
   */
  private async md5(text: string): Promise<string> {
    const crypto = await import('crypto')
    return crypto.createHash('md5').update(text).digest('hex')
  }

  /**
   * Inscrit (ou met à jour) un contact unique dans une audience Mailchimp,
   * avec merge fields et tags personnalisés. Utilisé par l'inscription au
   * keynote LAVEIYE.
   *
   * Si audienceId n'est pas fourni, l'audience principale (config) est utilisée.
   */
  async upsertMember(input: {
    email: string
    mergeFields?: Record<string, string>
    tags?: string[]
    audienceId?: string
    statusIfNew?: 'subscribed' | 'pending'
  }): Promise<
    | { ok: true; status: string; tagsOk: boolean; tagsError?: string }
    | { ok: false; error: string }
  > {
    if (!this.config) await this.loadConfig()
    const config = this.config!

    const unreadable = (config as MailchimpConfig & { apiKeyUnreadable?: boolean }).apiKeyUnreadable
    if (unreadable) {
      return {
        ok: false,
        error:
          'Clé API Mailchimp illisible (resaisissez-la dans Paramètres → Mailchimp et enregistrez).',
      }
    }

    if (!config.apiKey) {
      return { ok: false, error: 'Clé API Mailchimp non configurée' }
    }
    const audienceId = input.audienceId || config.audienceId
    if (!audienceId) {
      return { ok: false, error: 'Audience Mailchimp non configurée' }
    }

    let baseUrl = ''
    try {
      const dc = this.getDataCenter(config.apiKey)
      baseUrl = `https://${dc}.api.mailchimp.com/3.0`
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message || 'Configuration Mailchimp invalide',
      }
    }
    const subscriberHash = await this.md5(input.email.toLowerCase())
    const url = `${baseUrl}/lists/${audienceId}/members/${subscriberHash}`

    const body: Record<string, unknown> = {
      email_address: input.email,
      status_if_new: input.statusIfNew || 'subscribed',
    }
    if (input.mergeFields && Object.keys(input.mergeFields).length) {
      body.merge_fields = input.mergeFields
    }

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `apikey ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        return {
          ok: false,
          error: errData.detail || errData.title || `HTTP ${response.status}`,
        }
      }

      const data = await response.json()

      // Appliquer les tags séparément (endpoint dédié).
      // On vérifie la réponse : un échec ici laissait sinon un contact sans
      // ses balises (ex : tag par webinaire absent) sans aucune trace.
      let tagsOk = true
      let tagsError: string | undefined
      const tags = (input.tags || []).filter(Boolean)
      if (tags.length) {
        const tagsUrl = `${baseUrl}/lists/${audienceId}/members/${subscriberHash}/tags`
        const tagsBody = JSON.stringify({
          tags: tags.map((name) => ({ name, status: 'active' })),
        })
        // 2 tentatives : un contact tout juste créé peut renvoyer un 404
        // transitoire sur /tags (cohérence éventuelle côté Mailchimp).
        for (let attempt = 0; attempt < 2; attempt++) {
          tagsOk = true
          tagsError = undefined
          try {
            const tagsRes = await fetch(tagsUrl, {
              method: 'POST',
              headers: {
                Authorization: `apikey ${config.apiKey}`,
                'Content-Type': 'application/json',
              },
              body: tagsBody,
            })
            if (!tagsRes.ok) {
              const errData = await tagsRes.json().catch(() => ({}))
              tagsOk = false
              tagsError =
                errData.detail || errData.title || `HTTP ${tagsRes.status}`
            }
          } catch (err: any) {
            tagsOk = false
            tagsError = err?.message || 'Erreur réseau Mailchimp (tags)'
          }
          if (tagsOk) break
        }
        if (!tagsOk) {
          console.error(
            `[mailchimp] tags échoués pour ${input.email} [${tags.join(', ')}]: ${tagsError}`
          )
        }
      }

      return { ok: true, status: data.status || 'subscribed', tagsOk, tagsError }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Erreur réseau Mailchimp' }
    }
  }

  /**
   * Récupère les champs de fusion (merge fields) existants d'une audience.
   * Si audienceId n'est pas fourni, l'audience principale est utilisée.
   */
  async getMergeFields(
    audienceId?: string
  ): Promise<
    | { ok: true; tags: string[]; fields: { tag: string; name: string; type: string }[] }
    | { ok: false; error: string }
  > {
    if (!this.config) await this.loadConfig()
    const config = this.config!

    const unreadable = (config as MailchimpConfig & { apiKeyUnreadable?: boolean }).apiKeyUnreadable
    if (unreadable) {
      return {
        ok: false,
        error:
          'Clé API Mailchimp illisible (resaisissez-la dans Paramètres → Mailchimp et enregistrez).',
      }
    }
    if (!config.apiKey) {
      return { ok: false, error: 'Clé API Mailchimp non configurée' }
    }
    const listId = audienceId || config.audienceId
    if (!listId) {
      return { ok: false, error: 'Audience Mailchimp non configurée' }
    }

    let baseUrl = ''
    try {
      const dc = this.getDataCenter(config.apiKey)
      baseUrl = `https://${dc}.api.mailchimp.com/3.0`
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Configuration Mailchimp invalide' }
    }

    try {
      const url = `${baseUrl}/lists/${listId}/merge-fields?count=1000`
      const res = await fetch(url, {
        headers: {
          Authorization: `apikey ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { ok: false, error: data.detail || data.title || `HTTP ${res.status}` }
      }
      const fields = (data.merge_fields || []).map((f: any) => ({
        tag: f.tag,
        name: f.name,
        type: f.type,
      }))
      return { ok: true, tags: fields.map((f: { tag: string }) => f.tag), fields }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Erreur réseau Mailchimp' }
    }
  }

  /**
   * Vérifie que les champs de fusion requis existent dans une audience.
   * Avec `create: true`, crée les champs manquants (POST merge-fields).
   * La comparaison des tags est insensible à la casse.
   */
  async ensureMergeFields(
    required: MergeFieldDef[],
    opts?: { create?: boolean; audienceId?: string }
  ): Promise<
    | {
        ok: true
        existing: string[]
        missing: string[]
        created: string[]
        createErrors: { tag: string; error: string }[]
      }
    | { ok: false; error: string }
  > {
    if (!this.config) await this.loadConfig()
    const config = this.config!
    const listId = opts?.audienceId || config.audienceId

    const current = await this.getMergeFields(listId)
    if (!current.ok) return current

    const existingTags = new Set(current.tags.map((t) => t.toUpperCase()))
    const missingDefs = required.filter((d) => !existingTags.has(d.tag.toUpperCase()))
    const missing = missingDefs.map((d) => d.tag)
    const existing = required
      .filter((d) => existingTags.has(d.tag.toUpperCase()))
      .map((d) => d.tag)

    const created: string[] = []
    const createErrors: { tag: string; error: string }[] = []

    if (opts?.create && missingDefs.length) {
      let baseUrl = ''
      try {
        const dc = this.getDataCenter(config.apiKey)
        baseUrl = `https://${dc}.api.mailchimp.com/3.0`
      } catch (err: any) {
        return { ok: false, error: err?.message || 'Configuration Mailchimp invalide' }
      }

      for (const def of missingDefs) {
        try {
          const res = await fetch(`${baseUrl}/lists/${listId}/merge-fields`, {
            method: 'POST',
            headers: {
              Authorization: `apikey ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tag: def.tag,
              name: def.name,
              type: def.type || 'text',
              required: false,
              public: false,
            }),
          })
          const data = await res.json().catch(() => ({}))
          if (res.ok) {
            created.push(def.tag)
          } else {
            createErrors.push({
              tag: def.tag,
              error: data.detail || data.title || `HTTP ${res.status}`,
            })
          }
        } catch (err: any) {
          createErrors.push({ tag: def.tag, error: err?.message || 'Erreur réseau' })
        }
      }
    }

    return { ok: true, existing, missing, created, createErrors }
  }
}

// Singleton pour réutilisation
let mailchimpServiceInstance: MailchimpService | null = null

export function getMailchimpService(): MailchimpService {
  if (!mailchimpServiceInstance) {
    mailchimpServiceInstance = new MailchimpService()
  }
  return mailchimpServiceInstance
}
