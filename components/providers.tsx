
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth-provider"
import { SubscriptionStatusBottomSheet } from "@/components/subscription-status-bottom-sheet"
import { EmailVerificationBottomSheet } from "@/components/email-verification-bottom-sheet"
import { PromoPreviewBottomSheet } from "@/components/promo/promo-preview-bottom-sheet"
import { DARK_MODE_ENABLED } from "@/lib/theme-config"
import { Toaster } from "sonner"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      // LOT D : mode sombre désactivé → thème clair forcé partout, y compris
      // pour les préférences "dark" déjà stockées (localStorage).
      forcedTheme={DARK_MODE_ENABLED ? undefined : "light"}
      disableTransitionOnChange
    >
      <AuthProvider>
        {children}
        <SubscriptionStatusBottomSheet />
        <EmailVerificationBottomSheet />
        <PromoPreviewBottomSheet />
      </AuthProvider>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  )
}
