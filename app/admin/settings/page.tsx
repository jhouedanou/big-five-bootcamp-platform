"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function AdminSettingsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-heading)]">
          Parametres
        </h1>
        <p className="text-[#9CA3AF] mt-1">
          Configurez les parametres de votre plateforme
        </p>
      </div>

      <div className="space-y-6">
        {/* General settings */}
        <Card className="bg-[#122a52] border-[#1a3a6e]">
          <CardHeader>
            <CardTitle className="text-white">Parametres generaux</CardTitle>
            <CardDescription className="text-[#9CA3AF]">
              Informations de base de votre plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Nom de la plateforme</Label>
              <Input
                defaultValue="Big Five Bootcamp"
                className="bg-[#1a3a6e] border-[#1a3a6e] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Description</Label>
              <Textarea
                defaultValue="La plus grande bibliotheque de contenus marketing pour trouver l'inspiration creative."
                className="bg-[#1a3a6e] border-[#1a3a6e] text-white min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Email de contact</Label>
              <Input
                type="email"
                defaultValue="contact@bigfive.com"
                className="bg-[#1a3a6e] border-[#1a3a6e] text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Subscription settings */}
        <Card className="bg-[#122a52] border-[#1a3a6e]">
          <CardHeader>
            <CardTitle className="text-white">Abonnements</CardTitle>
            <CardDescription className="text-[#9CA3AF]">
              Configurez les plans dabonnement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Prix mensuel (EUR)</Label>
                <Input
                  type="number"
                  defaultValue="29"
                  className="bg-[#1a3a6e] border-[#1a3a6e] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Prix annuel (EUR)</Label>
                <Input
                  type="number"
                  defaultValue="290"
                  className="bg-[#1a3a6e] border-[#1a3a6e] text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Limite contenus gratuits/jour</Label>
              <Input
                type="number"
                defaultValue="5"
                className="bg-[#1a3a6e] border-[#1a3a6e] text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-[#122a52] border-[#1a3a6e]">
          <CardHeader>
            <CardTitle className="text-white">Notifications</CardTitle>
            <CardDescription className="text-[#9CA3AF]">
              Gerez les notifications de la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Nouveaux utilisateurs</p>
                <p className="text-[#9CA3AF] text-sm">
                  Recevoir un email pour chaque nouvelle inscription
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Nouveaux abonnements</p>
                <p className="text-[#9CA3AF] text-sm">
                  Recevoir un email pour chaque nouvel abonnement premium
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Rapports hebdomadaires</p>
                <p className="text-[#9CA3AF] text-sm">
                  Recevoir un rapport hebdomadaire par email
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
            Enregistrer les modifications
          </Button>
        </div>
      </div>
    </div>
  );
}
