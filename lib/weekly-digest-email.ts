/**
 * Gabarit de l'alerte e-mail hebdomadaire, à la charte LAVEIYE.
 *
 * Le gabarit précédent était en dégradé orange → violet avec des fonds
 * lavande : il ne correspondait à aucune couleur de la plateforme. Le brief
 * « Alertes e-mail hebdomadaires » demande de l'aligner sur l'univers
 * graphique — crème, doré, texte presque noir.
 *
 * Contraintes propres à l'e-mail, qui expliquent le style écrit à la main :
 * pas de feuille de style externe, pas de flexbox ni de grille fiables, des
 * tableaux pour la mise en page, et des couleurs en dur (les variables CSS ne
 * sont pas interprétées par la plupart des clients de messagerie).
 *
 * Le contenu est IDENTIQUE pour tous les destinataires : c'est ce qui permet
 * de l'envoyer en une seule campagne Mailchimp plutôt qu'un e-mail par
 * utilisateur.
 */

/** Charte LAVEIYE. */
const GOLD = '#F2B33D'
const CREAM = '#FFF4D6'
const CREAM_SOFT = '#FFFBF2'
const INK = '#0F0F0F'
const MUTED = '#6B6357'
const BORDER = '#F0E3C6'

export interface DigestCampaign {
  title: string
  brand?: string | null
  category?: string | null
  country?: string | null
  format?: string | null
  thumbnail?: string | null
  created_at?: string | null
  featured?: boolean | null
}

export interface WeeklyDigestInput {
  campaigns: DigestCampaign[]
  industries: string[]
  countries: string[]
  axes: string[]
  /** Libellé de la semaine, déjà formaté (« 10 août 2026 »). */
  weekLabel: string
  appUrl: string
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function chip(label: string): string {
  return `<span style="display:inline-block;background:${CREAM};color:${INK};padding:5px 12px;border-radius:999px;font-size:12px;font-weight:600;margin:0 6px 6px 0;">${escapeHtml(label)}</span>`
}

function statTile(value: number, label: string, hint: string): string {
  return `
    <td width="32%" style="text-align:center;padding:18px 10px;background:${CREAM_SOFT};border:1px solid ${BORDER};border-radius:14px;">
      <div style="font-size:30px;font-weight:800;color:${GOLD};line-height:1;">${value}</div>
      <div style="font-size:11px;color:${INK};font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-top:6px;">${escapeHtml(label)}</div>
      <div style="font-size:11px;color:${MUTED};margin-top:2px;">${escapeHtml(hint)}</div>
    </td>`
}

function campaignRow(campaign: DigestCampaign, appUrl: string): string {
  const meta = [campaign.brand, campaign.country, campaign.category, campaign.format]
    .filter(Boolean)
    .map((v) => escapeHtml(v))
    .join(' · ')

  const date = campaign.created_at
    ? new Date(campaign.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : ''

  return `
  <tr>
    <td style="padding:12px 16px;border-bottom:1px solid ${BORDER};">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          ${
            campaign.thumbnail
              ? `<td width="72" style="vertical-align:top;padding-right:12px;">
                   <img src="${escapeHtml(campaign.thumbnail)}" alt="" width="72" height="54" style="border-radius:8px;display:block;object-fit:cover;" />
                 </td>`
              : ''
          }
          <td style="vertical-align:top;">
            <a href="${escapeHtml(appUrl)}/dashboard" style="font-weight:700;color:${GOLD};text-decoration:none;font-size:14px;">${escapeHtml(campaign.title)}</a>
            <div style="font-size:12px;color:${MUTED};line-height:1.6;margin-top:2px;">${meta}</div>
          </td>
          ${date ? `<td width="120" style="vertical-align:top;text-align:right;font-size:12px;color:${MUTED};white-space:nowrap;">${escapeHtml(date)}</td>` : ''}
        </tr>
      </table>
    </td>
  </tr>`
}

/** Objet de la campagne, identique pour tous les destinataires. */
export function buildWeeklyDigestSubject(input: WeeklyDigestInput): string {
  const count = input.campaigns.length
  const topIndustries = input.industries.slice(0, 3).join(', ')
  const plural = count > 1 ? 's' : ''
  return topIndustries
    ? `${count} nouvelle${plural} campagne${plural} cette semaine — ${topIndustries}`
    : `${count} nouvelle${plural} campagne${plural} cette semaine`
}

/**
 * HTML complet de l'alerte.
 *
 * `*|UNSUB|*` est la balise de désabonnement Mailchimp : c'est Mailchimp qui
 * tient désormais la liste, un lien vers /profile ne suffirait pas.
 */
export function buildWeeklyDigestHtml(input: WeeklyDigestInput): string {
  const { campaigns, industries, countries, axes, weekLabel, appUrl } = input

  const listed = campaigns.slice(0, 8)
  const remaining = campaigns.length - listed.length
  const star = campaigns.find((c) => c.featured) || campaigns[0]
  const plural = campaigns.length > 1 ? 's' : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Laveiye — Votre veille créative de la semaine</title>
</head>
<body style="margin:0;padding:24px 12px;background:${CREAM_SOFT};font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid ${BORDER};border-radius:18px;overflow:hidden;">

    <!-- En-tête -->
    <tr>
      <td style="background:${CREAM_SOFT};padding:32px 24px 24px;text-align:center;border-bottom:1px solid ${BORDER};">
        <img src="${escapeHtml(appUrl)}/logo.png" alt="Laveiye" height="34" style="display:inline-block;border:0;" />
        <p style="color:${INK};margin:14px 0 0;font-size:15px;font-weight:600;">Votre veille créative — Semaine du ${escapeHtml(weekLabel)}</p>
      </td>
    </tr>

    <!-- Introduction -->
    <tr>
      <td style="padding:28px 24px 4px;">
        <p style="color:${INK};font-size:16px;line-height:1.6;margin:0 0 8px;">Bonjour,</p>
        <p style="color:${MUTED};font-size:15px;line-height:1.7;margin:0;">
          Cette semaine, <strong style="color:${GOLD};">${campaigns.length} nouvelle${plural} campagne${plural}</strong>
          ${campaigns.length > 1 ? 'ont été ajoutées' : 'a été ajoutée'} à la bibliothèque,
          couvrant <strong style="color:${INK};">${industries.length} secteur${industries.length > 1 ? 's' : ''}</strong>
          et <strong style="color:${INK};">${countries.length} pays</strong>.
        </p>
      </td>
    </tr>

    <!-- Chiffres clés -->
    <tr>
      <td style="padding:20px 24px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            ${statTile(campaigns.length, 'Campagnes', 'Nouvelles cette semaine')}
            <td width="2%"></td>
            ${statTile(industries.length, 'Secteurs', 'Représentés')}
            <td width="2%"></td>
            ${statTile(countries.length, 'Pays', 'Dans le scope')}
          </tr>
        </table>
      </td>
    </tr>

    <!-- Étiquettes -->
    <tr>
      <td style="padding:0 24px 8px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BORDER};border-radius:14px;">
          <tr>
            <td style="padding:16px;vertical-align:top;">
              <div style="font-size:11px;color:${INK};font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px;">Industries couvertes</div>
              ${industries.slice(0, 6).map(chip).join('')}
            </td>
            <td style="padding:16px;vertical-align:top;border-left:1px solid ${BORDER};">
              <div style="font-size:11px;color:${INK};font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px;">Pays représentés</div>
              ${countries.slice(0, 6).map(chip).join('')}
            </td>
            ${
              axes.length
                ? `<td style="padding:16px;vertical-align:top;border-left:1px solid ${BORDER};">
                     <div style="font-size:11px;color:${INK};font-weight:700;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px;">Axes créatifs</div>
                     ${axes.slice(0, 6).map(chip).join('')}
                   </td>`
                : ''
            }
          </tr>
        </table>
      </td>
    </tr>

    ${
      star
        ? `<!-- Campagne de la semaine -->
    <tr>
      <td style="padding:16px 24px 8px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CREAM_SOFT};border:1px solid ${BORDER};border-radius:14px;">
          <tr>
            ${
              star.thumbnail
                ? `<td width="200" style="padding:16px;vertical-align:middle;">
                     <img src="${escapeHtml(star.thumbnail)}" alt="" width="180" style="border-radius:10px;display:block;" />
                   </td>`
                : ''
            }
            <td style="padding:16px;vertical-align:middle;">
              <span style="display:inline-block;background:#FFFFFF;border:1px solid ${BORDER};color:${INK};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:5px 12px;border-radius:999px;">★ Campagne de la semaine</span>
              <h3 style="color:${INK};font-size:20px;margin:12px 0 4px;">${escapeHtml(star.title)}</h3>
              <p style="color:${MUTED};font-size:13px;margin:0 0 14px;">
                ${[star.brand, star.country, star.category].filter(Boolean).map((v) => escapeHtml(v)).join(' · ')}
              </p>
              <a href="${escapeHtml(appUrl)}/dashboard" style="display:inline-block;background:${GOLD};color:${INK};padding:11px 26px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;">Voir la campagne</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
        : ''
    }

    <!-- Toutes les nouveautés -->
    <tr>
      <td style="padding:16px 24px 8px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BORDER};border-radius:14px;">
          <tr>
            <td style="padding:14px 16px;border-bottom:1px solid ${BORDER};">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:11px;color:${INK};font-weight:700;text-transform:uppercase;letter-spacing:0.6px;">Toutes les nouveautés</td>
                  <td style="text-align:right;">
                    <a href="${escapeHtml(appUrl)}/dashboard" style="color:${GOLD};font-size:12px;font-weight:600;text-decoration:none;">Voir toutes les campagnes →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${listed.map((c) => campaignRow(c, appUrl)).join('')}
        </table>
        ${
          remaining > 0
            ? `<p style="color:${MUTED};font-size:13px;margin:10px 0 0;text-align:center;">+ ${remaining} autre${remaining > 1 ? 's' : ''} campagne${remaining > 1 ? 's' : ''} sur la plateforme</p>`
            : ''
        }
      </td>
    </tr>

    <!-- Appel à l'action -->
    <tr>
      <td style="text-align:center;padding:24px;">
        <a href="${escapeHtml(appUrl)}/dashboard" style="display:inline-block;background:${GOLD};color:${INK};padding:16px 44px;border-radius:999px;text-decoration:none;font-weight:800;font-size:16px;">Explorer la bibliothèque</a>
      </td>
    </tr>

    <!-- Pied de page -->
    <tr>
      <td style="background:${CREAM_SOFT};padding:20px 24px;text-align:center;border-top:1px solid ${BORDER};">
        <p style="color:${MUTED};font-size:12px;margin:0;line-height:1.7;">
          Vous recevez cet e-mail car vous êtes inscrit sur Laveiye.<br />
          <a href="${escapeHtml(appUrl)}/profile" style="color:${GOLD};font-weight:600;">Gérer mes préférences</a>
          &nbsp;·&nbsp;
          <a href="*|UNSUB|*" style="color:${MUTED};">Se désabonner</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}
