"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowRegistrations: true,
    emailNotifications: true,
    publicAccess: true,
  });

  const handleSave = () => {
    // In a real app, this would save to backend
    toast.success("Parametres enregistres avec succes");
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-heading)]">
            Parametres
          </h1>
          <p className="text-[#9CA3AF] mt-1">
            Configuration globale de la plateforme
          </p>
        </div>
        <Button onClick={handleSave} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card className="bg-[#122a52] border-[#1a3a6e]">
          <CardHeader>
            <CardTitle className="text-white">General</CardTitle>
            <CardDescription className="text-[#9CA3AF]">
              Parametres generaux de l'application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white text-base">Mode Maintenance</Label>
                <p className="text-sm text-[#9CA3AF]">
                  Desactive l'acces public au site pour maintenance
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white text-base">Inscriptions</Label>
                <p className="text-sm text-[#9CA3AF]">
                  Autoriser les nouvelles inscriptions utilisateurs
                </p>
              </div>
              <Switch
                checked={settings.allowRegistrations}
                onCheckedChange={(checked) => setSettings({ ...settings, allowRegistrations: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Access Settings */}
        <Card className="bg-[#122a52] border-[#1a3a6e]">
          <CardHeader>
            <CardTitle className="text-white">Acces et Paiements</CardTitle>
            <CardDescription className="text-[#9CA3AF]">
              Configuration des acces par defaut
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white text-base">Acces Public</Label>
                <p className="text-sm text-[#9CA3AF]">
                  Le contenu gratuit est visible sans connexion
                </p>
              </div>
              <Switch
                checked={settings.publicAccess}
                onCheckedChange={(checked) => setSettings({ ...settings, publicAccess: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-[#122a52] border-[#1a3a6e]">
          <CardHeader>
            <CardTitle className="text-white">Notifications</CardTitle>
            <CardDescription className="text-[#9CA3AF]">
              Configuration des emails automatiques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white text-base">Emails Transactionnels</Label>
                <p className="text-sm text-[#9CA3AF]">
                  Envoyer des emails de bienvenue et de confirmation
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
