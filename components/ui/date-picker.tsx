"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  displayFormat?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Sélectionner une date",
  className,
  displayFormat = "MMM yyyy"
}: DatePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [open, setOpen] = React.useState(false)

  const handleSelect = (newDate: Date | undefined) => {
    setSelectedDate(newDate)
    onDateChange?.(newDate)
    setOpen(false)
  }

  React.useEffect(() => {
    setSelectedDate(date)
  }, [date])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-white border-gray-300",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, displayFormat, { locale: fr })
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

// Composant simplifié pour sélection mois/année seulement
interface MonthYearPickerProps {
  value?: string // Format "Jan 2024"
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

const MONTHS = [
  "Jan", "Fév", "Mars", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc"
]

export function MonthYearPicker({
  value,
  onChange,
  placeholder = "Sélectionner le mois",
  className
}: MonthYearPickerProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)
  
  const [open, setOpen] = React.useState(false)
  const [selectedMonth, setSelectedMonth] = React.useState<string>("")
  const [selectedYear, setSelectedYear] = React.useState<number>(currentYear)

  // Parse initial value
  React.useEffect(() => {
    if (value) {
      const parts = value.split(" ")
      if (parts.length === 2) {
        setSelectedMonth(parts[0])
        setSelectedYear(parseInt(parts[1]) || currentYear)
      }
    }
  }, [value, currentYear])

  const handleSelect = (month: string) => {
    setSelectedMonth(month)
    const newValue = `${month} ${selectedYear}`
    onChange?.(newValue)
    setOpen(false)
  }

  const handleYearChange = (year: number) => {
    setSelectedYear(year)
    if (selectedMonth) {
      onChange?.(`${selectedMonth} ${year}`)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-white border-gray-300 text-gray-900",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? (
            <span>{value}</span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        <div className="space-y-3">
          {/* Sélecteur d'année */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleYearChange(selectedYear - 1)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-semibold text-lg">{selectedYear}</span>
            <button
              type="button"
              onClick={() => handleYearChange(selectedYear + 1)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Grille des mois */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((month) => (
              <button
                key={month}
                type="button"
                onClick={() => handleSelect(month)}
                className={cn(
                  "px-3 py-2 text-sm rounded-md transition-colors",
                  selectedMonth === month
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-gray-100 text-gray-700"
                )}
              >
                {month}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
