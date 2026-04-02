import { getSupabaseAdmin } from '@/lib/supabase-server'
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption'

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
}

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

    // Déchiffrer la clé API si elle est chiffrée
    const rawApiKey = settings['mailchimp_api_key'] || ''
    const apiKey = isEncrypted(rawApiKey) ? decrypt(rawApiKey) : rawApiKey

    this.config = {
      apiKey,
      audienceId: settings['mailchimp_audience_id'] || '',
      fromName: settings['mailchimp_from_name'] || '',
      fromEmail: settings['mailchimp_from_email'] || '',
      defaultTag: settings['mailchimp_default_tag'] || '',
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
    const parts = apiKey.split('-')
    return parts[parts.length - 1] || 'us1'
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

    const dc = this.getDataCenter(key)
    const url = `https://${dc}.api.mailchimp.com/3.0/`

    try {
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
      .select('brand, category, axe, country, created_at')
      .eq('status', 'Publié')

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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://bigfive.solutions'

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

    if (!config.apiKey || !config.audienceId) {
      return { success: false, synced: 0, errors: ['Configuration Mailchimp incomplète'] }
    }

    const supabase = getSupabaseAdmin()
    const { data: users, error } = await supabase
      .from('users')
      .select('email, name, subscription_plan, subscription_status')

    if (error) {
      return { success: false, synced: 0, errors: [`Erreur récupération utilisateurs: ${error.message}`] }
    }

    const dc = this.getDataCenter(config.apiKey)
    const baseUrl = `https://${dc}.api.mailchimp.com/3.0`
    const errors: string[] = []
    let synced = 0

    for (const user of (users || [])) {
      if (!user.email) continue

      try {
        // Utiliser l'opération batch/upsert de Mailchimp
        const subscriberHash = await this.md5(user.email.toLowerCase())
        const url = `${baseUrl}/lists/${config.audienceId}/members/${subscriberHash}`

        const body: any = {
          email_address: user.email,
          status_if_new: 'subscribed',
          merge_fields: {
            FNAME: user.name?.split(' ')[0] || '',
            LNAME: user.name?.split(' ').slice(1).join(' ') || '',
            PLAN: user.subscription_plan || 'Free',
          },
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
   * Calcule le hash MD5 d'une chaîne (utilisé par Mailchimp pour identifier les membres)
   */
  private async md5(text: string): Promise<string> {
    const crypto = await import('crypto')
    return crypto.createHash('md5').update(text).digest('hex')
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
