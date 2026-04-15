"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function AuthCodeErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const errorDescription = searchParams.get("error_description");

  const getMessage = () => {
    if (errorDescription) return decodeURIComponent(errorDescription);
    if (reason === "missing_code") return "Le code d'authentification est manquant dans l'URL.";
    return "Le lien d'authentification n'est pas valide ou a expiré.";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 via-blue-50 to-white p-4">
      <Card className="max-w-md w-full shadow-xl border-2">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-[#1A1F2B]">
            Erreur d&apos;authentification
          </CardTitle>
          <CardDescription className="text-base">
            {getMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <h3 className="font-semibold text-sm text-amber-900 mb-2">
              Causes possibles :
            </h3>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              <li>Le lien a expiré (valide 1 heure)</li>
              <li>Le lien a déjà été utilisé</li>
              <li>Le lien est incorrect ou incomplet</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Vous pouvez demander un nouveau lien de réinitialisation
            </p>
            
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/forgot-password">
                  <Mail className="mr-2 h-4 w-4" />
                  Demander un nouveau lien
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à la connexion
                </Link>
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Si le problème persiste, contactez le support à{" "}
              <a href="mailto:contacts@bigfiveabidjan.com" className="text-primary hover:underline">
                contacts@bigfiveabidjan.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={null}>
      <AuthCodeErrorContent />
    </Suspense>
  );
}
