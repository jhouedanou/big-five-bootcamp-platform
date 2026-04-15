/**
 * Vérification côté serveur du token hCaptcha.
 * À utiliser dans les API routes (register, contact, etc.)
 */

const HCAPTCHA_SECRET_KEY = process.env.HCAPTCHA_SECRET_KEY

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
  // Si la clé secrète n'est pas configurée, ignorer la vérification en développement
  if (!HCAPTCHA_SECRET_KEY) {
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ HCAPTCHA_SECRET_KEY non configurée — captcha ignoré en développement")
      return { success: true }
    }
    return { success: false, error: "hCaptcha non configuré côté serveur" }
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
    return {
      success: false,
      error: `Vérification captcha échouée: ${errorCodes.join(", ")}`,
    }
  } catch (err) {
    console.error("Erreur vérification hCaptcha:", err)
    return { success: false, error: "Erreur lors de la vérification du captcha" }
  }
}
