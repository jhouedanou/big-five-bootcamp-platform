"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderOpen,
  Users,
  Eye,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const stats = [
  {
    title: "Total Contenus",
    value: "2,847",
    change: "+12%",
    trend: "up",
    icon: FolderOpen,
  },
  {
    title: "Utilisateurs Actifs",
    value: "1,234",
    change: "+8%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Vues ce mois",
    value: "45,678",
    change: "+23%",
    trend: "up",
    icon: Eye,
  },
  {
    title: "Taux de conversion",
    value: "3.2%",
    change: "-0.5%",
    trend: "down",
    icon: TrendingUp,
  },
];

const recentContent = [
  { id: 1, title: "Campagne Nike Summer 2024", status: "Publie", date: "Il y a 2h" },
  { id: 2, title: "Apple Vision Pro Launch", status: "En attente", date: "Il y a 4h" },
  { id: 3, title: "Spotify Wrapped 2024", status: "Publie", date: "Il y a 6h" },
  { id: 4, title: "Tesla Cybertruck Campaign", status: "Brouillon", date: "Il y a 8h" },
  { id: 5, title: "Netflix Series Promo", status: "Publie", date: "Il y a 12h" },
];

const recentUsers = [
  { id: 1, name: "Marie Dupont", email: "marie@example.com", plan: "Premium", date: "Il y a 1h" },
  { id: 2, name: "Jean Martin", email: "jean@example.com", plan: "Free", date: "Il y a 3h" },
  { id: 3, name: "Sophie Bernard", email: "sophie@example.com", plan: "Premium", date: "Il y a 5h" },
  { id: 4, name: "Lucas Petit", email: "lucas@example.com", plan: "Free", date: "Il y a 7h" },
];

export default function AdminDashboardPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-heading)]">
          Dashboard
        </h1>
        <p className="text-[#9CA3AF] mt-1">
          Vue densemble de votre plateforme
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-[#122a52] border-[#1a3a6e]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-[#1a3a6e] rounded-lg flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-[#FF6B35]" />
                </div>
                <div
                  className={`flex items-center gap-1 text-sm ${
                    stat.trend === "up" ? "text-[#10B981]" : "text-red-400"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[#9CA3AF] text-sm">{stat.title}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent content */}
        <Card className="bg-[#122a52] border-[#1a3a6e]">
          <CardHeader>
            <CardTitle className="text-white">Contenus recents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentContent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-[#1a3a6e] last:border-0"
                >
                  <div>
                    <p className="text-white font-medium">{item.title}</p>
                    <p className="text-[#9CA3AF] text-sm">{item.date}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === "Publie"
                        ? "bg-[#10B981]/20 text-[#10B981]"
                        : item.status === "En attente"
                        ? "bg-[#FFD23F]/20 text-[#FFD23F]"
                        : "bg-[#6B7280]/20 text-[#9CA3AF]"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent users */}
        <Card className="bg-[#122a52] border-[#1a3a6e]">
          <CardHeader>
            <CardTitle className="text-white">Nouveaux utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between py-3 border-b border-[#1a3a6e] last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1a3a6e] rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-[#9CA3AF] text-sm">{user.email}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.plan === "Premium"
                        ? "bg-[#FF6B35]/20 text-[#FF6B35]"
                        : "bg-[#6B7280]/20 text-[#9CA3AF]"
                    }`}
                  >
                    {user.plan}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
