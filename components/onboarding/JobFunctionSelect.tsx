"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { JOB_FUNCTIONS, OTHER_JOB_FUNCTION } from "@/lib/onboarding"

interface JobFunctionSelectProps {
  value: string
  onChange: (value: string) => void
  otherValue: string
  onOtherChange: (value: string) => void
}

export function JobFunctionSelect({
  value,
  onChange,
  otherValue,
  onOtherChange,
}: JobFunctionSelectProps) {
  const isOther = value === OTHER_JOB_FUNCTION

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-900">
          Fonction <span className="text-[#F2B33D]">*</span>
        </label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionnez votre fonction" />
          </SelectTrigger>
          <SelectContent>
            {JOB_FUNCTIONS.map((fn) => (
              <SelectItem key={fn} value={fn}>
                {fn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isOther && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-900">
            Précisez votre fonction <span className="text-[#F2B33D]">*</span>
          </label>
          <Input
            value={otherValue}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="Votre fonction"
            maxLength={120}
          />
        </div>
      )}
    </div>
  )
}
