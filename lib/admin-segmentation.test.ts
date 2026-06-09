import { describe, expect, it } from "vitest"
import { getActivityStatus } from "./admin-segmentation"

/**
 * Tâche 7 — fiabilité de la logique « compte dormant ».
 * Référence figée pour des tests déterministes : 2026-06-09T12:00:00Z.
 */
const NOW = new Date("2026-06-09T12:00:00Z").getTime()
const DAY = 86_400_000
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString()

describe("getActivityStatus", () => {
  it("classe un compte jamais connecté (last_login_at null)", () => {
    expect(getActivityStatus(null, null, NOW)).toBe("never_connected")
    // Même si une activité résiduelle existe, sans connexion = jamais connecté.
    expect(getActivityStatus(null, daysAgo(2), NOW)).toBe("never_connected")
  })

  it("classe un compte actif récent (≤ 7 j)", () => {
    expect(getActivityStatus(daysAgo(0), null, NOW)).toBe("active_recent")
    expect(getActivityStatus(daysAgo(7), null, NOW)).toBe("active_recent")
  })

  it("classe un compte actif (8 – 30 j)", () => {
    expect(getActivityStatus(daysAgo(8), null, NOW)).toBe("active")
    expect(getActivityStatus(daysAgo(30), null, NOW)).toBe("active")
  })

  it("classe un compte inactif (31 – 59 j)", () => {
    expect(getActivityStatus(daysAgo(31), null, NOW)).toBe("inactive")
    expect(getActivityStatus(daysAgo(59), null, NOW)).toBe("inactive")
  })

  it("classe un compte dormant (≥ 60 j) — critère officiel", () => {
    // Limite exacte du seuil : 60 j = dormant.
    expect(getActivityStatus(daysAgo(60), null, NOW)).toBe("dormant")
    expect(getActivityStatus(daysAgo(365), null, NOW)).toBe("dormant")
  })

  it("vérifie la borne 59/60 j (absence de faux positif au seuil)", () => {
    expect(getActivityStatus(daysAgo(59), null, NOW)).toBe("inactive")
    expect(getActivityStatus(daysAgo(60), null, NOW)).toBe("dormant")
  })

  it("privilégie last_activity_at sur last_login_at quand présent", () => {
    // Connecté il y a 90 j mais actif il y a 2 j → actif récent.
    expect(getActivityStatus(daysAgo(90), daysAgo(2), NOW)).toBe("active_recent")
    // Connecté il y a 2 j mais aucune activité depuis → on retombe sur le login.
    expect(getActivityStatus(daysAgo(2), null, NOW)).toBe("active_recent")
  })
})
