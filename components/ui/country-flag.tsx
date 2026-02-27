import { CI } from "country-flag-icons/react/3x2"
import { SN } from "country-flag-icons/react/3x2"
import { BJ } from "country-flag-icons/react/3x2"
import { BF } from "country-flag-icons/react/3x2"
import { TG } from "country-flag-icons/react/3x2"
import { GN } from "country-flag-icons/react/3x2"
import { NG } from "country-flag-icons/react/3x2"
import { ZA } from "country-flag-icons/react/3x2"
import { GH } from "country-flag-icons/react/3x2"
import { KE } from "country-flag-icons/react/3x2"
import { MA } from "country-flag-icons/react/3x2"
import { FR } from "country-flag-icons/react/3x2"
import { US } from "country-flag-icons/react/3x2"
import { CM } from "country-flag-icons/react/3x2"
import { ML } from "country-flag-icons/react/3x2"
import { NE } from "country-flag-icons/react/3x2"
import { CG } from "country-flag-icons/react/3x2"
import { CD } from "country-flag-icons/react/3x2"
import { GA } from "country-flag-icons/react/3x2"
import { TN } from "country-flag-icons/react/3x2"
import { DZ } from "country-flag-icons/react/3x2"
import { EG } from "country-flag-icons/react/3x2"
import { RW } from "country-flag-icons/react/3x2"
import { TZ } from "country-flag-icons/react/3x2"
import { MZ } from "country-flag-icons/react/3x2"
import { MG } from "country-flag-icons/react/3x2"
import type { ComponentType, SVGAttributes } from "react"

const flagComponents: Record<string, ComponentType<SVGAttributes<SVGElement>>> = {
  CI, SN, BJ, BF, TG, GN, NG, ZA, GH, KE, MA, FR, US, CM, ML, NE, CG, CD, GA, TN, DZ, EG, RW, TZ, MZ, MG,
}

const countryCodeMap: Record<string, string> = {
  "Côte d'Ivoire": "CI",
  "Cote d'Ivoire": "CI",
  "Sénégal": "SN",
  "Senegal": "SN",
  "Bénin": "BJ",
  "Benin": "BJ",
  "Burkina Faso": "BF",
  "Togo": "TG",
  "Guinée": "GN",
  "Guinee": "GN",
  "Nigeria": "NG",
  "Afrique du Sud": "ZA",
  "Ghana": "GH",
  "Kenya": "KE",
  "Maroc": "MA",
  "France": "FR",
  "USA": "US",
  "Cameroun": "CM",
  "Mali": "ML",
  "Niger": "NE",
  "Congo": "CG",
  "RDC": "CD",
  "Gabon": "GA",
  "Tunisie": "TN",
  "Algérie": "DZ",
  "Égypte": "EG",
  "Egypte": "EG",
  "Rwanda": "RW",
  "Tanzanie": "TZ",
  "Mozambique": "MZ",
  "Madagascar": "MG",
}

interface CountryFlagProps {
  country: string
  className?: string
}

export function CountryFlag({ country, className = "h-4 w-5" }: CountryFlagProps) {
  const code = countryCodeMap[country]
  if (!code) return <span className={className}>🌍</span>

  const FlagComponent = flagComponents[code]
  if (!FlagComponent) return <span className={className}>🌍</span>

  return <FlagComponent className={`${className} inline-block rounded-sm`} />
}
