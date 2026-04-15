/**
 * Vérification côté serveur du token hCaptcha.
 * À utiliser dans les API routes (register, contact, etc.)
 */

const HCAPTCHA_SECRET_KEY = process.env.HCAPTCHA_SECRET_KEY?.trim()

const HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify"

export interface HCaptchaVerifyResult {
  success: boolean
  "challenge_ts"?: string
  hostname?: string
  "error-codes"?: string[]
}

/**
 * Vérifie un token hCaptcha auprès de l'API hCaptcha.
 * 
 * @param token - Le token hCaptcha envoyé par le client
 * @param remoteIp - (optionnel) L'adresse IP de l'utilisateur
 * @returns Le résultat de la vérification
 */
export async function verifyHCaptcha(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  // Si la clé secrète n'est pas configurée ou est vide, 
  // accepter le captcha (la vérification client-side est toujours active)
  if (!HCAPTCHA_SECRET_KEY) {
    console.warn("⚠️ HCAPTCHA_SECRET_KEY non configurée — vérification serveur ignorée")
    return { success: true }
  }

  // Vérifier que ce n'est pas la site key par erreur
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim()
  if (siteKey && HCAPTCHA_SECRET_KEY === siteKey) {
    console.error("❌ HCAPTCHA_SECRET_KEY est identique à la SITE KEY ! La Secret Key est une clé DIFFÉRENTE disponible sur https://dashboard.hcaptcha.com")
    // Ne pas bloquer l'utilisateur pour une erreur de config
    return { success: true }
  }

  if (!token) {
    return { success: false, error: "Token captcha manquant" }
  }

  try {
    const params = new URLSearchParams({
      secret: HCAPTCHA_SECRET_KEY,
      response: token,
    })

    if (remoteIp) {
      params.append("remoteip", remoteIp)
    }

    const response = await fetch(HCAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    })

    const data: HCaptchaVerifyResult = await response.json()

    if (data.success) {
      return { success: true }
    }

    const errorCodes = data["error-codes"] || []
    console.error("hCaptcha verification failed:", errorCodes)

    // Si c'est une erreur de config serveur (secret key invalide), ne pas bloquer l'utilisateur
    if (errorCodes.includes("invalid-input-secret") || errorCodes.includes("missing-input-secret")) {
      console.error("❌ La HCAPTCHA_SECRET_KEY est invalide. Récupérez-la sur https://dashboard.hcaptcha.com → Settings")
      return { success: true }
    }

    return {
      success: false,
      error: "Vérification captcha échouée. Veuillez réessayer.",
    }
  } catch (err) {
    console.error("Erreur vérification hCaptcha:", err)
    // En cas d'erreur réseau, ne pas bloquer l'utilisateur
    return { success: true }
  }
}
