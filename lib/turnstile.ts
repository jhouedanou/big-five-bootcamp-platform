const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export interface TurnstileVerifyResult {
  success: boolean
  errorCodes?: string[]
  challengeTs?: string
  hostname?: string
  action?: string
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return { success: false, errorCodes: ["missing-secret-key"] }
  }
  if (!token) {
    return { success: false, errorCodes: ["missing-input-response"] }
  }

  const body = new URLSearchParams()
  body.append("secret", secret)
  body.append("response", token)
  if (remoteIp) body.append("remoteip", remoteIp)

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
    })
    const data = (await res.json()) as {
      success: boolean
      "error-codes"?: string[]
      challenge_ts?: string
      hostname?: string
      action?: string
    }
    return {
      success: data.success,
      errorCodes: data["error-codes"],
      challengeTs: data.challenge_ts,
      hostname: data.hostname,
      action: data.action,
    }
  } catch (error) {
    return {
      success: false,
      errorCodes: [error instanceof Error ? error.message : "verify-failed"],
    }
  }
}
