"use client"

import { CalendarPlus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { trackEvent } from "@/lib/analytics"
import { googleCalendarUrl, outlookCalendarUrl, type Webinar } from "@/lib/webinars"

interface AddToCalendarProps {
  webinar: Webinar
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm"
}

/** Bouton "Ajouter au calendrier" — Google / Outlook / .ics. */
export function AddToCalendar({ webinar, variant = "outline", size = "sm" }: AddToCalendarProps) {
  function track(target: string) {
    trackEvent("webinar_calendar_clicked", { webinar_id: webinar.id, target })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <CalendarPlus className="size-4" /> Ajouter au calendrier
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a
            href={googleCalendarUrl(webinar)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("google")}
          >
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={outlookCalendarUrl(webinar)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("outlook")}
          >
            Outlook Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/api/webinars/${webinar.id}/calendar.ics`} onClick={() => track("ics")}>
            Fichier .ics
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
