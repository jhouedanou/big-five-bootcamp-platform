"use client";

import { useState } from "react";
import { useAdmin, Content } from "../AdminContext";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Trash2, Edit, MoreVertical, FileText, Video, Megaphone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ContentPage() {
  const { content, addContent, updateContent, deleteContent } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Content>>({
    title: "",
    status: "Brouillon",
    author: "",
    type: "campagne",
  });

  const filteredContent = content.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingContent(null);
    setFormData({
      title: "",
      status: "Brouillon",
      author: "",
      type: "campagne",
    });
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (item: Content) => {
    setEditingContent(item);
    setFormData(item);
    setIsAddDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContent) {
      updateContent(editingContent.id, formData);
    } else {
      addContent(formData as Omit<Content, "id" | "date">);
    }
    setIsAddDialogOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-5 w-5 text-blue-400" />;
      case "article":
        return <FileText className="h-5 w-5 text-green-400" />;
      default:
        return <Megaphone className="h-5 w-5 text-[#FF6B35]" />;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-heading)]">
            Contenus
          </h1>
          <p className="text-[#9CA3AF] mt-1">
            Gerez les campagnes et les ressources
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter du contenu
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-[#122a52] border-[#1a3a6e]">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <Input
              placeholder="Rechercher par titre ou auteur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#071428] border-[#1a3a6e] text-white placeholder:text-[#9CA3AF]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      <div className="grid gap-4">
        {filteredContent.map((item) => (
          <Card key={item.id} className="bg-[#122a52] border-[#1a3a6e]">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#1a3a6e] flex items-center justify-center">
                  {getIcon(item.type)}
                </div>
                <div>
                  <h3 className="text-white font-medium">{item.title}</h3>
                  <p className="text-[#9CA3AF] text-sm">Par {item.author} • {item.date}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.status === 'Publie' 
                      ? 'bg-[#10B981]/20 text-[#10B981]' 
                      : item.status === 'En attente'
                      ? 'bg-[#FFD23F]/20 text-[#FFD23F]'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-[#9CA3AF] hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#071428] border-[#1a3a6e] text-white">
                    <DropdownMenuItem onClick={() => handleOpenEdit(item)} className="hover:bg-[#1a3a6e] cursor-pointer">
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteContent(item.id)} className="text-red-400 hover:bg-[#1a3a6e] hover:text-red-300 cursor-pointer">
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
            <DialogTitle>{editingContent ? "Modifier le contenu" : "Ajouter du contenu"}</DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              {editingContent ? "Modifiez les informations du contenu." : "Creez une nouvelle campagne ou ressource."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#071428] border-[#1a3a6e] text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Auteur</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="bg-[#071428] border-[#1a3a6e] text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="bg-[#071428] border-[#1a3a6e] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#071428] border-[#1a3a6e] text-white">
                    <SelectItem value="campagne">Campagne</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="bg-[#071428] border-[#1a3a6e] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#071428] border-[#1a3a6e] text-white">
                    <SelectItem value="Brouillon">Brouillon</SelectItem>
                    <SelectItem value="En attente">En attente</SelectItem>
                    <SelectItem value="Publie">Publie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                {editingContent ? "Enregistrer" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
