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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-[family-name:var(--font-heading)]">
            Paramètres
          </h1>
          <p className="text-gray-600 mt-1">
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
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Général</CardTitle>
            <CardDescription className="text-gray-600">
              Paramètres généraux de l'application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-gray-900 text-base">Mode Maintenance</Label>
                <p className="text-sm text-gray-600">
                  Désactive l'accès public au site pour maintenance
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-gray-900 text-base">Inscriptions</Label>
                <p className="text-sm text-gray-600">
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
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Accès et Paiements</CardTitle>
            <CardDescription className="text-gray-600">
              Configuration des accès par défaut
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-gray-900 text-base">Accès Public</Label>
                <p className="text-sm text-gray-600">
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
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Notifications</CardTitle>
            <CardDescription className="text-gray-600">
              Configuration des emails automatiques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-gray-900 text-base">Emails Transactionnels</Label>
                <p className="text-sm text-gray-600">
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
