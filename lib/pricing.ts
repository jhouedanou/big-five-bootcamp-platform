export const PLAN_FREE = {
  name: "Gratuit",
  price: 0,
  annualPrice: null,
  clicksPerMonth: 5,
  searchesPerDay: 3,
  features: {
    library: "preview_scroll" as const,
    filters: "greyed" as const,
    favorites: false,
    download: false,
    weeklyEmail: true,
    usageCounter: false,
    multiUsers: 1,
    brandCollection: false,
  },
}

export const PLAN_BASIC = {
  name: "Basic",
  price: 4900,
  annualPrice: 49000,
  clicksPerMonth: Infinity,
  searchesPerDay: 10,
  features: {
    library: "full" as const,
    filters: "full" as const,
    favorites: true,
    download: true,
    weeklyEmail: true,
    usageCounter: true,
    multiUsers: 1,
    brandCollection: false,
  },
}

export const PLAN_PRO = {
  name: "Pro",
  price: 9900,
  annualPrice: 99000,
  clicksPerMonth: Infinity,
  searchesPerDay: Infinity,
  features: {
    library: "full" as const,
    filters: "full" as const,
    favorites: true,
    download: true,
    weeklyEmail: true,
    usageCounter: true,
    multiUsers: 1,
    brandCollection: true,
  },
}

export type PlanKey = "Free" | "Basic" | "Pro" | "Premium" | "Agency"

export function getPlanConfig(plan: PlanKey) {
  switch (plan.toLowerCase()) {
    case "pro":
    case "premium":
      return PLAN_PRO
    case "basic":
      return PLAN_BASIC
    default:
      return PLAN_FREE
  }
}

export function isPaidPlan(plan: string): boolean {
  const p = plan.toLowerCase()
  return p === "basic" || p === "pro" || p === "premium"
}
