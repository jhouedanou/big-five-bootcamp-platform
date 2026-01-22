"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus,
  MoreHorizontal,
  Edit,
  Eye,
  Filter,
  Save,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Loading from "./loading";

type AdminContent = {
  id: string;
  title: string;
  brand: string;
  industry: string;
  format: string;
  isPremium: boolean;
  date: string;
  type: "contenu" | "campagne";
  status: "Publie" | "En attente" | "Brouillon";
  thumbnail?: string;
};

const initialContent: AdminContent[] = [
  {
    id: "1",
    title: "MTN Ghana - Mobile Money",
    brand: "MTN",
    industry: "Telecoms",
    format: "Video",
    isPremium: true,
    date: "Jan 2024",
    type: "campagne",
    status: "Publie",
    thumbnail: "/placeholder.svg",
  },
  {
    id: "2",
    title: "Jumia - Black Friday",
    brand: "Jumia",
    industry: "E-commerce",
    format: "Campagne 360",
    isPremium: false,
    date: "Nov 2024",
    type: "campagne",
    status: "En attente",
    thumbnail: "/placeholder.svg",
  },
  {
    id: "3",
    title: "Wave - Envoi simplifié",
    brand: "Wave",
    industry: "Fintech",
    format: "Video",
    isPremium: false,
    date: "Dec 2024",
    type: "contenu",
    status: "Publie",
    thumbnail: "/placeholder.svg",
  },
  {
    id: "4",
    title: "Big Five Academy",
    brand: "Big Five",
    industry: "Education",
    format: "Article",
    isPremium: true,
    date: "Jan 2025",
    type: "contenu",
    status: "Brouillon",
    thumbnail: "/placeholder.svg",
  },
];

export default function AdminContentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<AdminContent[]>(initialContent);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AdminContent> | null>(null);
  const filteredContent = useMemo(
    () =>
      items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.brand.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [items, searchQuery]
  );

  const startEdit = (item: AdminContent) => {
    setEditingId(item.id);
    setDraft(item);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!editingId || !draft) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== editingId || !draft) return item;
        return { ...item, ...draft };
      })
    );
    cancelEdit();
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-heading)]">
            Gestion des contenus
          </h1>
          <p className="text-[#9CA3AF] mt-1">
            {items.length} éléments (contenus & campagnes)
          </p>
        </div>
        <Button className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un contenu
        </Button>
      </div>

      {/* Search and filters */}
      <Card className="bg-[#122a52] border-[#1a3a6e] mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                placeholder="Rechercher un contenu..."
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

      {/* Content table */}
      <Suspense fallback={<Loading />}>
        <Card className="bg-[#122a52] border-[#1a3a6e]">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#1a3a6e] hover:bg-transparent">
                  <TableHead className="text-[#9CA3AF]">Contenu</TableHead>
                  <TableHead className="text-[#9CA3AF]">Marque</TableHead>
                  <TableHead className="text-[#9CA3AF]">Industrie</TableHead>
                  <TableHead className="text-[#9CA3AF]">Format</TableHead>
                  <TableHead className="text-[#9CA3AF]">Type</TableHead>
                  <TableHead className="text-[#9CA3AF]">Statut</TableHead>
                  <TableHead className="text-[#9CA3AF] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContent.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-[#1a3a6e] hover:bg-[#1a3a6e]/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-10 bg-[#1a3a6e] rounded overflow-hidden">
                          <Image
                            src={item.thumbnail || "/placeholder.svg"}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-white font-medium line-clamp-1">
                            {item.title}
                          </p>
                          <p className="text-[#9CA3AF] text-sm">{item.date}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">{item.brand}</TableCell>
                    <TableCell className="text-[#9CA3AF]">{item.industry}</TableCell>
                    <TableCell className="text-[#9CA3AF]">{item.format}</TableCell>
                    <TableCell className="text-[#9CA3AF] capitalize">{item.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
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
                        <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                          {(() => {
                            const currentPremium =
                              editingId === item.id ? draft?.isPremium ?? item.isPremium : item.isPremium;
                            return (
                              <>
                                <Switch
                                  checked={currentPremium}
                                  onCheckedChange={(checked) => {
                                    if (editingId === item.id && draft) {
                                      setDraft({ ...draft, isPremium: checked });
                                    } else {
                                      setItems((prev) =>
                                        prev.map((c) =>
                                          c.id === item.id ? { ...c, isPremium: checked } : c
                                        )
                                      );
                                    }
                                  }}
                                  className="data-[state=checked]:bg-[#FF6B35]"
                                />
                                <span>{currentPremium ? "Premium" : "Public"}</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </TableCell>
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
                            Voir
                          </DropdownMenuItem>
                          {editingId === item.id ? (
                            <>
                              <DropdownMenuItem
                                className="text-white hover:bg-[#1a3a6e] cursor-pointer"
                                onClick={saveEdit}
                              >
                                <Save className="h-4 w-4 mr-2" />
                                Enregistrer
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-white hover:bg-[#1a3a6e] cursor-pointer"
                                onClick={cancelEdit}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Annuler
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem
                              className="text-white hover:bg-[#1a3a6e] cursor-pointer"
                              onClick={() => startEdit(item)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Suspense>
    </div>
  );
}
