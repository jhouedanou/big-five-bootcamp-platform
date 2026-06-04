/**
 * Types + helpers webinaires #BigFiveDécrypte.
 */

export type WebinarStatus = "draft" | "published" | "completed" | "cancelled"

export interface Webinar {
  id: string
  title: string
  slug: string
  short_description: string | null
  full_description: string | null
  date: string // YYYY-MM-DD
  start_time: string | null // HH:MM[:SS]
  end_time: string | null
  timezone: string
  meeting_link: string | null
  speaker_name: string | null
  status: WebinarStatus
  registration_enabled: boolean
  public_preview_enabled: boolean
  max_participants: number | null
  created_at: string
  updated_at: string
}

export interface WebinarWithMeta extends Webinar {
  registrations_count: number
  is_registered: boolean
}

/** Statut affiché côté public. */
export type PublicStatus = "à venir" | "inscriptions ouvertes" | "terminé" | "complet" | "annulé"

/** Combine date + heure en Date (heure locale du navigateur/serveur). */
export function webinarStartDate(w: Pick<Webinar, "date" | "start_time">): Date {
  const time = w.start_time || "00:00:00"
  return new Date(`${w.date}T${normalizeTime(time)}`)
}

export function isPast(w: Pick<Webinar, "date" | "end_time" | "start_time">, nowMs = Date.now()): boolean {
  const time = w.end_time || w.start_time || "23:59:59"
  const end = new Date(`${w.date}T${normalizeTime(time)}`).getTime()
  return !isNaN(end) && end < nowMs
}

/** Statut public dérivé (à venir / inscriptions ouvertes / terminé / complet / annulé). */
export function computePublicStatus(
  w: Webinar,
  registrationsCount: number,
  nowMs = Date.now()
): PublicStatus {
  if (w.status === "cancelled") return "annulé"
  if (w.status === "completed" || isPast(w, nowMs)) return "terminé"
  if (w.max_participants != null && registrationsCount >= w.max_participants) return "complet"
  if (w.registration_enabled) return "inscriptions ouvertes"
  return "à venir"
}

export function canRegister(w: Webinar, registrationsCount: number, nowMs = Date.now()): boolean {
  if (w.status !== "published") return false
  if (!w.registration_enabled) return false
  if (isPast(w, nowMs)) return false
  if (w.max_participants != null && registrationsCount >= w.max_participants) return false
  return true
}

function normalizeTime(t: string): string {
  // 'HH:MM' → 'HH:MM:00'
  const parts = t.split(":")
  if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`
  return t
}

// ---------------------------------------------------------------------------
// Calendrier
// ---------------------------------------------------------------------------

/** 'YYYY-MM-DD' + 'HH:MM[:SS]' → 'YYYYMMDDTHHMMSS' (heure locale flottante). */
function toCalStamp(date: string, time: string | null): string {
  const d = date.replace(/-/g, "")
  const t = normalizeTime(time || "00:00:00").replace(/:/g, "")
  return `${d}T${t}`
}

/** Ajoute 1h à une heure 'HH:MM[:SS]' (fallback quand end_time absent). */
function plusOneHour(time: string | null): string {
  const [h, m] = normalizeTime(time || "00:00:00").split(":")
  const hh = (parseInt(h, 10) + 1) % 24
  return `${String(hh).padStart(2, "0")}:${m}:00`
}

function calEnd(w: Webinar): { time: string } {
  return { time: w.end_time || plusOneHour(w.start_time) }
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

/** Fichier .ics (RFC 5545) — heure flottante (interprétée localement). */
export function buildIcs(w: Webinar): string {
  const start = toCalStamp(w.date, w.start_time)
  const end = toCalStamp(w.date, calEnd(w).time)
  const desc = [w.short_description, w.meeting_link ? `Lien : ${w.meeting_link}` : ""]
    .filter(Boolean)
    .join("\\n")

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Laveiye//BigFiveDecrypte//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:webinar-${w.id}@laveiye.com`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(w.title)}`,
    desc ? `DESCRIPTION:${icsEscape(desc)}` : "",
    w.meeting_link ? `LOCATION:${icsEscape(w.meeting_link)}` : "",
    w.meeting_link ? `URL:${icsEscape(w.meeting_link)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n")
}

export function googleCalendarUrl(w: Webinar): string {
  const dates = `${toCalStamp(w.date, w.start_time)}/${toCalStamp(w.date, calEnd(w).time)}`
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: w.title,
    dates,
    details: [w.short_description || "", w.meeting_link ? `Lien : ${w.meeting_link}` : ""]
      .filter(Boolean)
      .join("\n"),
    location: w.meeting_link || "",
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function outlookCalendarUrl(w: Webinar): string {
  const startIso = `${w.date}T${normalizeTime(w.start_time || "00:00:00")}`
  const endIso = `${w.date}T${normalizeTime(calEnd(w).time)}`
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: w.title,
    startdt: startIso,
    enddt: endIso,
    body: [w.short_description || "", w.meeting_link ? `Lien : ${w.meeting_link}` : ""]
      .filter(Boolean)
      .join("\n"),
    location: w.meeting_link || "",
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
