"use client";

import { useState } from "react";
import { useAdmin, User } from "../AdminContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Trash2, Edit, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({
    name: "",
    email: "",
    role: "user",
    plan: "Free",
    status: "active",
  });

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      role: "user",
      plan: "Free",
      status: "active",
    });
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData(user);
    setIsAddDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      updateUser(editingUser.id, formData);
    } else {
      addUser(formData as Omit<User, "id" | "createdAt">);
    }
    setIsAddDialogOpen(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-heading)]">
            Utilisateurs
          </h1>
          <p className="text-[#9CA3AF] mt-1">
            Gerez les comptes et les acces
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un utilisateur
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[#122a52] border-[#1a3a6e]">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <Input
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#071428] border-[#1a3a6e] text-white placeholder:text-[#9CA3AF]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="bg-[#122a52] border-[#1a3a6e]">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1a3a6e] flex items-center justify-center text-white font-bold">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-white font-medium">{user.name}</h3>
                  <p className="text-[#9CA3AF] text-sm">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.plan === 'Premium' ? 'bg-[#FF6B35]/20 text-[#FF6B35]' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {user.plan}
                  </span>
                  <p className="text-[#9CA3AF] text-xs mt-1">
                    {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-[#9CA3AF] hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#071428] border-[#1a3a6e] text-white">
                    <DropdownMenuItem onClick={() => handleOpenEdit(user)} className="hover:bg-[#1a3a6e] cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteUser(user.id)} className="text-red-400 hover:bg-[#1a3a6e] hover:text-red-300 cursor-pointer">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-[#122a52] border-[#1a3a6e] text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}</DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              {editingUser ? "Modifiez les informations de l'utilisateur." : "Creez un nouveau compte utilisateur."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-[#071428] border-[#1a3a6e] text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-[#071428] border-[#1a3a6e] text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="bg-[#071428] border-[#1a3a6e] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#071428] border-[#1a3a6e] text-white">
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value: any) => setFormData({ ...formData, plan: value })}
                >
                  <SelectTrigger className="bg-[#071428] border-[#1a3a6e] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#071428] border-[#1a3a6e] text-white">
                    <SelectItem value="Free">Gratuit</SelectItem>
                    <SelectItem value="Premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                {editingUser ? "Enregistrer" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
