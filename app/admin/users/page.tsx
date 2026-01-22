"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Filter,
  Mail,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Loading from "./loading";

const users = [
  {
    id: 1,
    name: "Marie Dupont",
    email: "marie.dupont@example.com",
    plan: "Premium",
    status: "Actif",
    joinDate: "12 Jan 2024",
    lastActive: "Il y a 2h",
  },
  {
    id: 2,
    name: "Jean Martin",
    email: "jean.martin@example.com",
    plan: "Free",
    status: "Actif",
    joinDate: "8 Jan 2024",
    lastActive: "Il y a 1j",
  },
  {
    id: 3,
    name: "Sophie Bernard",
    email: "sophie.bernard@example.com",
    plan: "Premium",
    status: "Actif",
    joinDate: "5 Jan 2024",
    lastActive: "Il y a 3h",
  },
  {
    id: 4,
    name: "Lucas Petit",
    email: "lucas.petit@example.com",
    plan: "Free",
    status: "Inactif",
    joinDate: "1 Jan 2024",
    lastActive: "Il y a 7j",
  },
  {
    id: 5,
    name: "Emma Leroy",
    email: "emma.leroy@example.com",
    plan: "Premium",
    status: "Actif",
    joinDate: "28 Dec 2023",
    lastActive: "Il y a 5h",
  },
  {
    id: 6,
    name: "Thomas Moreau",
    email: "thomas.moreau@example.com",
    plan: "Free",
    status: "Actif",
    joinDate: "20 Dec 2023",
    lastActive: "Il y a 12h",
  },
];

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-heading)]">
            Gestion des utilisateurs
          </h1>
          <p className="text-[#9CA3AF] mt-1">{users.length} utilisateurs inscrits</p>
        </div>
      </div>

      {/* Search and filters */}
      <Card className="bg-[#122a52] border-[#1a3a6e] mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#1a3a6e] border-[#1a3a6e] text-white placeholder:text-[#9CA3AF]"
              />
            </div>
            <Button
              variant="outline"
              className="border-[#1a3a6e] text-white hover:bg-[#1a3a6e] bg-transparent"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card className="bg-[#122a52] border-[#1a3a6e]">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#1a3a6e] hover:bg-transparent">
                <TableHead className="text-[#9CA3AF]">Utilisateur</TableHead>
                <TableHead className="text-[#9CA3AF]">Plan</TableHead>
                <TableHead className="text-[#9CA3AF]">Statut</TableHead>
                <TableHead className="text-[#9CA3AF]">Inscription</TableHead>
                <TableHead className="text-[#9CA3AF]">Derniere activite</TableHead>
                <TableHead className="text-[#9CA3AF] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-[#1a3a6e] hover:bg-[#1a3a6e]/50"
                >
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.plan === "Premium"
                          ? "bg-[#FF6B35]/20 text-[#FF6B35]"
                          : "bg-[#6B7280]/20 text-[#9CA3AF]"
                      }`}
                    >
                      {user.plan}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === "Actif"
                          ? "bg-[#10B981]/20 text-[#10B981]"
                          : "bg-[#6B7280]/20 text-[#9CA3AF]"
                      }`}
                    >
                      {user.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-[#9CA3AF]">{user.joinDate}</TableCell>
                  <TableCell className="text-[#9CA3AF]">{user.lastActive}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-[#9CA3AF] hover:text-white hover:bg-[#1a3a6e]"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#122a52] border-[#1a3a6e]"
                      >
                        <DropdownMenuItem className="text-white hover:bg-[#1a3a6e] cursor-pointer">
                          <Eye className="h-4 w-4 mr-2" />
                          Voir le profil
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white hover:bg-[#1a3a6e] cursor-pointer">
                          <Mail className="h-4 w-4 mr-2" />
                          Envoyer un email
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-white hover:bg-[#1a3a6e] cursor-pointer">
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 hover:bg-[#1a3a6e] cursor-pointer">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
