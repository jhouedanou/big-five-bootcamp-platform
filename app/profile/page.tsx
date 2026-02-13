"use client"

import { useState } from "react"
import Link from "next/link"
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { User, Mail, Camera, CreditCard, Clock, Bell, Globe, Check, ArrowRight } from "lucide-react"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState("fr")

  // Mock user data
  const user = {
    name: "John Doe",
    email: "john@exemple.com",
    avatar: "",
    status: "trial", // "trial" | "subscribed" | "expired"
    trialDaysLeft: 25,
    subscriptionEndDate: "15 Fevrier 2024",
  }

  const recentContent = [
    { id: "1", title: "MTN Ghana - Mobile Money Campaign", date: "Il y a 2 heures" },
    { id: "2", title: "Orange CI - Fete de la Musique", date: "Hier" },
    { id: "3", title: "Jumia Nigeria - Black Friday Madness", date: "Il y a 3 jours" },
    { id: "4", title: "Wave Senegal - Envoi d'argent simplifie", date: "Il y a 5 jours" },
    { id: "5", title: "Dangote Cement - Building Africa", date: "Il y a 1 semaine" },
  ]

  return (
    <div className="min-h-screen bg-white">
      <DashboardNavbar />
      
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-[#1A1F2B]">Mon Profil</h1>
        
        {/* Account Info Section */}
        <section className="mt-8 rounded-xl border border-[#D0E4F2] bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[#1A1F2B]">Informations du compte</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="bg-white border-[#D0E4F2] text-[#1A1F2B]"
            >
              {isEditing ? "Annuler" : "Modifier"}
            </Button>
          </div>
          
          <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#80368D] text-2xl font-bold text-white">
                {user.name.split(" ").map(n => n[0]).join("")}
              </div>
              {isEditing && (
                <button 
                  type="button"
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#D0E4F2] text-[#1A1F2B]/60 shadow-sm transition-colors hover:bg-[#D0E4F2]/80"
                  aria-label="Changer la photo de profil"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name" className="text-sm text-[#1A1F2B]/60">Nom complet</Label>
                  {isEditing ? (
                    <Input id="name" defaultValue={user.name} className="mt-1 border-[#D0E4F2]" />
                  ) : (
                    <p className="mt-1 font-medium text-[#1A1F2B]">{user.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-foreground">{user.email}</p>
                  </div>
                </div>
              </div>
              
              {isEditing && (
                <Button className="shadow-lg shadow-primary/25">
                  Sauvegarder les modifications
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Subscription Section */}
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-card-foreground">Abonnement</h2>
          
          <div className="mt-4">
            {user.status === "trial" && (
              <div className="rounded-lg bg-[#10B981]/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981]/20">
                      <Clock className="h-5 w-5 text-[#10B981]" />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981] px-2 py-0.5 text-xs font-medium text-white">
                        <Check className="h-3 w-3" />
                        Essai gratuit
                      </span>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Il te reste <span className="font-semibold text-foreground">{user.trialDaysLeft} jours</span> {"d'essai gratuit"}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-[#10B981]/20">
                    <div 
                      className="h-full rounded-full bg-[#10B981] transition-all"
                      style={{ width: `${(user.trialDaysLeft / 30) * 100}%` }}
                    />
                  </div>
                </div>
                
                <Button asChild className="mt-4 w-full shadow-lg shadow-primary/25 sm:w-auto">
                  <Link href="/subscribe">
                    Passer a {"l'abonnement"} payant
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
            
            {user.status === "subscribed" && (
              <div className="rounded-lg bg-primary/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      <Check className="h-3 w-3" />
                      Abonne Premium
                    </span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {"Abonnement actif jusqu'au"} <span className="font-semibold text-foreground">{user.subscriptionEndDate}</span>
                    </p>
                  </div>
                </div>
                
                <Button variant="outline" className="mt-4 bg-transparent">
                  Gerer {"l'abonnement"}
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Recent History */}
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-card-foreground">Historique recent</h2>
          
          <div className="mt-4 divide-y divide-border">
            {recentContent.map((item) => (
              <Link 
                key={item.id} 
                href={`/content/${item.id}`}
                className="flex items-center justify-between py-3 transition-colors hover:bg-muted/50"
              >
                <span className="text-sm text-foreground">{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.date}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Preferences */}
        <section className="mt-6 rounded-xl border border-border bg-card p-6">
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-card-foreground">Preferences</h2>
          
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Notifications email</p>
                  <p className="text-xs text-muted-foreground">Recevoir des alertes sur les nouveaux contenus</p>
                </div>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Langue</p>
                  <p className="text-xs text-muted-foreground">Langue de {"l'interface"}</p>
                </div>
              </div>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                aria-label="Sélectionner la langue de l'interface"
              >
                <option value="fr">Francais</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
