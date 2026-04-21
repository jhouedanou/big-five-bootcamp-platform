"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Lock, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowRegistrations: true,
    emailNotifications: true,
    publicAccess: true,
  });

  // Email contact settings
  const [contactToEmail, setContactToEmail] = useState("");
  const [contactFromEmail, setContactFromEmail] = useState("");
  const [isLoadingEmailSettings, setIsLoadingEmailSettings] = useState(true);
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false);

  // Charger les paramètres email depuis la BDD
  useEffect(() => {
    const fetchEmailSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (data.settings) {
          setContactToEmail(data.settings.contact_to_email || "contact@laveiye.com");
          setContactFromEmail(data.settings.contact_from_email || "Laveiye <onboarding@resend.dev>");
        }
      } catch {
        console.error("Erreur chargement paramètres email");
      } finally {
        setIsLoadingEmailSettings(false);
      }
    };
    fetchEmailSettings();
  }, []);

  const handleSaveEmailSettings = async () => {
    setIsSavingEmailSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            contact_to_email: contactToEmail,
            contact_from_email: contactFromEmail,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }

      toast.success("Paramètres email enregistrés");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setIsSavingEmailSettings(false);
    }
  };

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSave = () => {
    toast.success("Paramètres enregistrés avec succès");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("Le nouveau mot de passe doit être différent de l'actuel");
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Erreur lors du changement de mot de passe");
        return;
      }

      toast.success("Mot de passe modifié avec succès");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Erreur de connexion au serveur");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-[family-name:var(--font-heading)]">
            Paramètres
          </h1>
          <p className="text-gray-600 mt-1">
            Configuration globale de la plateforme
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Password Change */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Lock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-gray-900">Changer le mot de passe</CardTitle>
                <CardDescription className="text-gray-600">
                  Modifiez votre mot de passe administrateur
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="currentPassword" className="text-gray-900">Mot de passe actuel</Label>
              <div className="relative mt-1.5">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Votre mot de passe actuel"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-gray-900">Nouveau mot de passe</Label>
              <div className="relative mt-1.5">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-gray-900">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le nouveau mot de passe"
                className="mt-1.5"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Modification...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Modifier le mot de passe
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Email Contact Settings */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#F2B33D]/10">
                <Mail className="h-5 w-5 text-[#0F0F0F]" />
              </div>
              <div>
                <CardTitle className="text-gray-900">Emails de contact</CardTitle>
                <CardDescription className="text-gray-600">
                  Configurez les adresses email utilisées par le formulaire de contact
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-w-lg">
            {isLoadingEmailSettings ? (
              <div className="flex items-center gap-2 text-gray-500 py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Chargement des paramètres...</span>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="contactToEmail" className="text-gray-900">Email destinataire</Label>
                  <p className="text-xs text-gray-500 mb-1.5">L'adresse qui reçoit les messages du formulaire</p>
                  <Input
                    id="contactToEmail"
                    type="email"
                    value={contactToEmail}
                    onChange={(e) => setContactToEmail(e.target.value)}
                    placeholder="contact@laveiye.com"
                  />
                </div>
                <div>
                  <Label htmlFor="contactFromEmail" className="text-gray-900">Email expéditeur</Label>
                  <p className="text-xs text-gray-500 mb-1.5">L'adresse affichée comme expéditeur (doit être vérifiée sur Resend)</p>
                  <Input
                    id="contactFromEmail"
                    type="text"
                    value={contactFromEmail}
                    onChange={(e) => setContactFromEmail(e.target.value)}
                    placeholder="Laveiye <onboarding@resend.dev>"
                  />
                </div>
                <Button
                  onClick={handleSaveEmailSettings}
                  disabled={isSavingEmailSettings || !contactToEmail}
                  className="bg-[#F2B33D] hover:bg-[#F2B33D] text-white shadow-lg shadow-[#F2B33D]/25"
                >
                  {isSavingEmailSettings ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Enregistrer les emails
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

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

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
            <Save className="h-4 w-4 mr-2" />
            Enregistrer les paramètres
          </Button>
        </div>
      </div>
    </div>
  );
}
