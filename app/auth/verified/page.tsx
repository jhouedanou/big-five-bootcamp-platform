"use client"

import Link from "next/link"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AuthVerifiedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F5F5F5] via-white to-white p-4">
      <Card className="max-w-md w-full shadow-xl border-2">
        <CardHeader className="text-center pb-4">
          <div className="mb-6 flex justify-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F2B33D]">
                <img src="/logo.png" alt="Laveiye" className="relative h-12 w-12 rounded-xl" />
              </div>
            </Link>
          </div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#0F0F0F]">
            Compte vérifié !
          </CardTitle>
          <CardDescription className="text-base">
            Ton adresse email a bien été confirmée. Tu peux maintenant te connecter pour accéder à la bibliothèque créative Laveiye.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            asChild
            className="w-full bg-[#F2B33D] hover:bg-[#F2B33D]/90 text-white font-semibold"
          >
            <Link href="/login" className="flex items-center justify-center gap-2">
              Se connecter
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:underline">
              Retour à l&apos;accueil
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
