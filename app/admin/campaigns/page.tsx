"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAdmin } from "../AdminContext";
import type { ContentItem } from "@/components/dashboard/content-card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Trash2,
  Edit,
  MoreVertical,
  Globe,
  Megaphone,
  Eye,
  ImagePlus,
  X,
  Video,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText,
  Image,
  Sparkles,
  Check,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { CSVImporter } from "@/components/admin/csv-importer";
import { cn } from "@/lib/utils";

const platforms = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "Twitter/X"];
const countries = ["Cote d'Ivoire", "Nigeria", "Kenya", "Ghana", "Senegal", "Maroc", "Afrique du Sud"];
const sectors = ["Telecoms", "E-commerce", "Banque/Finance", "FMCG", "Tech", "Energie", "Industrie"];
const formats = ["Video Ad", "Story", "Carousel", "Post Social", "Campagne 360"];
const statuses = ["Brouillon", "En attente", "Publié"] as const;

const FORM_STEPS = [
  { id: 1, title: "Informations", icon: FileText, description: "Détails de base" },
  { id: 2, title: "Médias", icon: Image, description: "Images et vidéos" },
  { id: 3, title: "Description", icon: Sparkles, description: "Analyse et conseils" },
];

const defaultFormData: Omit<ContentItem, "id"> = {
  title: "",
  description: "",
  imageUrl: "",
  images: [],
  videoUrl: "",
  platform: "Facebook",
  country: "Cote d'Ivoire",
  sector: "Telecoms",
  format: "Video Ad",
  tags: [],
  date: "",
  brand: "",
  agency: "",
  year: new Date().getFullYear(),
  isVideo: false,
  status: "Brouillon",
};

export default function CampaignsPage() {
  const { campaigns, addCampaign, updateCampaign, deleteCampaign } = useAdmin();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<ContentItem | null>(null);
  const [formData, setFormData] = useState<Omit<ContentItem, "id">>(defaultFormData);
  const [tagInput, setTagInput] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [previewCampaign, setPreviewCampaign] = useState<ContentItem | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);

  // Ouvrir automatiquement le formulaire si ?action=new
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setEditingCampaign(null);
      setFormData(defaultFormData);
      setTagInput("");
      setImageInput("");
      setIsDialogOpen(true);
    }
  }, [searchParams]);

  const filteredCampaigns = campaigns.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.agency || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = filterSector === "all" || item.sector === filterSector;
    return matchesSearch && matchesSector;
  });

  const handleOpenAdd = () => {
    setEditingCampaign(null);
    setFormData(defaultFormData);
    setTagInput("");
    setImageInput("");
    setCurrentStep(1);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: ContentItem) => {
    setEditingCampaign(item);
    setFormData({
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      images: item.images || [],
      videoUrl: item.videoUrl || "",
      platform: item.platform,
      country: item.country,
      sector: item.sector,
      format: item.format,
      tags: item.tags,
      date: item.date,
      brand: item.brand || "",
      agency: item.agency || "",
      year: item.year || new Date().getFullYear(),
      isVideo: item.isVideo || false,
      status: item.status || "Brouillon",
    });
    setTagInput("");
    setImageInput("");
    setCurrentStep(1);
    setIsDialogOpen(true);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleAddImage = () => {
    const url = imageInput.trim();
    if (url && !(formData.images || []).includes(url)) {
      setFormData({ ...formData, images: [...(formData.images || []), url] });
      setImageInput("");
    }
  };

  const handleRemoveImage = (url: string) => {
    setFormData({ ...formData, images: (formData.images || []).filter((img) => img !== url) });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    if (editingCampaign) {
      await updateCampaign(editingCampaign.id, formData);
    } else {
      await addCampaign(formData);
    }
    setIsDialogOpen(false);
    setCurrentStep(1);
  };

  const handleDelete = async (id: string) => {
    await deleteCampaign(id);
  };

  const handlePublish = async (item: ContentItem) => {
    const newStatus = item.status === "Publié" ? "Brouillon" : "Publié";
    await updateCampaign(item.id, { status: newStatus });
  };

  const sectorColor = (sector: string) => {
    const colors: Record<string, string> = {
      Telecoms: "bg-blue-500/20 text-blue-400",
      "E-commerce": "bg-pink-500/20 text-pink-400",
      "Banque/Finance": "bg-purple-500/20 text-purple-400",
      FMCG: "bg-orange-500/20 text-orange-400",
      Tech: "bg-cyan-500/20 text-cyan-400",
      Energie: "bg-yellow-500/20 text-yellow-400",
      Industrie: "bg-slate-500/20 text-slate-400",
    };
    return colors[sector] || "bg-gray-500/20 text-gray-400";
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-[family-name:var(--font-heading)]">
            Exemples de Campagnes
          </h1>
          <p className="text-[#9CA3AF] mt-1">
            Gerez les exemples de campagnes affiches sur la plateforme ({campaigns.length} campagnes)
          </p>
        </div>
        <div className="flex gap-2">
          <CSVImporter onImportComplete={() => window.location.reload()} />
          <Button onClick={handleOpenAdd} className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une campagne
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-[#122a52] border-[#1a3a6e]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <Input
                placeholder="Rechercher par titre, marque ou agence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#071428] border-[#1a3a6e] text-white placeholder:text-[#9CA3AF]"
              />
            </div>
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-full sm:w-[200px] bg-[#071428] border-[#1a3a6e] text-white">
                <SelectValue placeholder="Filtrer par secteur" />
              </SelectTrigger>
              <SelectContent className="bg-[#071428] border-[#1a3a6e] text-white">
                <SelectItem value="all">Tous les secteurs</SelectItem>
                {sectors.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaign List */}
      <div className="grid gap-4">
        {filteredCampaigns.length === 0 ? (
          <Card className="bg-[#122a52] border-[#1a3a6e]">
            <CardContent className="p-8 text-center">
              <Megaphone className="h-12 w-12 text-[#9CA3AF] mx-auto mb-4" />
              <p className="text-[#9CA3AF]">Aucune campagne trouvee</p>
            </CardContent>
          </Card>
        ) : (
          filteredCampaigns.map((item) => (
            <Card key={item.id} className="bg-[#122a52] border-[#1a3a6e]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#1a3a6e] flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Megaphone className="h-6 w-6 text-[#FF6B35]" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{item.title}</h3>
                      <p className="text-[#9CA3AF] text-sm mt-0.5 truncate">
                        {item.brand && <span>{item.brand}</span>}
                        {item.agency && <span> - {item.agency}</span>}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {/* Badge de statut */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === "Publié" ? "bg-green-500/20 text-green-400" :
                          item.status === "En attente" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-gray-500/20 text-gray-400"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.status === "Publié" ? "bg-green-400" :
                            item.status === "En attente" ? "bg-yellow-400" :
                            "bg-gray-400"
                          }`}></span>
                          {item.status || "Brouillon"}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sectorColor(item.sector)}`}>
                          {item.sector}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1a3a6e] text-[#9CA3AF]">
                          <Globe className="h-3 w-3 mr-1" />
                          {item.country}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1a3a6e] text-[#9CA3AF]">
                          {item.platform}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1a3a6e] text-[#9CA3AF]">
                          {item.format}
                        </span>
                        {item.date && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#1a3a6e] text-[#9CA3AF]">
                            {item.date}
                          </span>
                        )}
                      </div>
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#FF6B35]/20 text-[#FF6B35]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-[#9CA3AF] hover:text-white flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#071428] border-[#1a3a6e] text-white">
                      <DropdownMenuItem
                        onClick={() => setPreviewCampaign(item)}
                        className="hover:bg-[#1a3a6e] cursor-pointer"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Apercu
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePublish(item)}
                        className={`hover:bg-[#1a3a6e] cursor-pointer ${
                          item.status === "Publié" ? "text-yellow-400" : "text-green-400"
                        }`}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {item.status === "Publié" ? "Dépublier" : "Publier"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleOpenEdit(item)}
                        className="hover:bg-[#1a3a6e] cursor-pointer"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:bg-[#1a3a6e] hover:text-red-300 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewCampaign} onOpenChange={() => { setPreviewCampaign(null); setPreviewImageIndex(0); }}>
        <DialogContent className="bg-[#122a52] border-[#1a3a6e] text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewCampaign?.title}</DialogTitle>
          </DialogHeader>
          {previewCampaign && (() => {
            const allImages = [previewCampaign.imageUrl, ...(previewCampaign.images || [])].filter(Boolean);
            return (
              <div className="space-y-4">
                {allImages.length > 0 && (
                  <div className="relative rounded-lg overflow-hidden">
                    <img
                      src={allImages[previewImageIndex] || ""}
                      alt={`${previewCampaign.title} - ${previewImageIndex + 1}`}
                      className="w-full h-48 object-cover"
                    />
                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setPreviewImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPreviewImageIndex((prev) => (prev + 1) % allImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {allImages.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setPreviewImageIndex(i)}
                              className={`w-2 h-2 rounded-full ${i === previewImageIndex ? "bg-[#FF6B35]" : "bg-white/50"}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {previewCampaign.videoUrl && (
                  <div className="rounded-lg overflow-hidden">
                    <div className="text-sm text-[#9CA3AF] mb-1 flex items-center gap-1">
                      <Video className="h-3 w-3" /> Video
                    </div>
                    <iframe
                      src={previewCampaign.videoUrl}
                      className="w-full aspect-video rounded-lg"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                )}
                <p className="text-[#9CA3AF]">{previewCampaign.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[#9CA3AF]">Marque:</span>{" "}
                    <span className="text-white">{previewCampaign.brand || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF]">Agence:</span>{" "}
                    <span className="text-white">{previewCampaign.agency || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF]">Plateforme:</span>{" "}
                    <span className="text-white">{previewCampaign.platform}</span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF]">Pays:</span>{" "}
                    <span className="text-white">{previewCampaign.country}</span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF]">Secteur:</span>{" "}
                    <span className="text-white">{previewCampaign.sector}</span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF]">Format:</span>{" "}
                    <span className="text-white">{previewCampaign.format}</span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF]">Date:</span>{" "}
                    <span className="text-white">{previewCampaign.date}</span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF]">Annee:</span>{" "}
                    <span className="text-white">{previewCampaign.year || "-"}</span>
                  </div>
                </div>
                {previewCampaign.tags.length > 0 && (
                  <div>
                    <span className="text-[#9CA3AF] text-sm">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {previewCampaign.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#FF6B35]/20 text-[#FF6B35]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog - Multi-Step Form */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setCurrentStep(1);
      }}>
        <DialogContent className="bg-[#122a52] border-[#1a3a6e] text-white sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? "Modifier la campagne" : "Ajouter une campagne"}
            </DialogTitle>
            <DialogDescription className="text-[#9CA3AF]">
              {editingCampaign
                ? "Modifiez les informations de la campagne."
                : "Remplissez les informations pour creer une nouvelle campagne."}
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Header */}
          <div className="flex items-center justify-between px-2 py-4 border-b border-[#1a3a6e]">
            {FORM_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={cn(
                    "flex items-center cursor-pointer",
                    currentStep >= step.id ? "opacity-100" : "opacity-50"
                  )}
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                >
                  <div 
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                      currentStep === step.id 
                        ? "border-[#FF6B35] bg-[#FF6B35] text-white" 
                        : currentStep > step.id 
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-[#9CA3AF]/30 text-[#9CA3AF]"
                    )}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <p className={cn(
                      "text-xs font-medium",
                      currentStep === step.id ? "text-white" : "text-[#9CA3AF]"
                    )}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < FORM_STEPS.length - 1 && (
                  <div 
                    className={cn(
                      "w-8 sm:w-16 h-0.5 mx-2",
                      currentStep > step.id ? "bg-green-500" : "bg-[#9CA3AF]/30"
                    )} 
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="camp-title">Titre *</Label>
                  <Input
                    id="camp-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-[#071428] border-[#1a3a6e] text-white"
                    placeholder="Ex: MTN Ghana - Mobile Money Campaign"
                  />
                </div>

                {/* Brand & Agency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="camp-brand">Marque</Label>
                    <Input
                      id="camp-brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="bg-[#071428] border-[#1a3a6e] text-white"
                      placeholder="Ex: MTN"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="camp-agency">Agence</Label>
                    <Input
                      id="camp-agency"
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      className="bg-[#071428] border-[#1a3a6e] text-white"
                      placeholder="Ex: Ogilvy Africa"
                    />
                  </div>
                </div>

                {/* Platform & Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Plateforme</Label>
                    <Select
                      value={formData.platform}
                      onValueChange={(value) => setFormData({ ...formData, platform: value })}
                    >
                      <SelectTrigger className="bg-[#071428] border-[#1a3a6e] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#071428] border-[#1a3a6e] text-white">
                        {platforms.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pays</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                    >
                      <SelectTrigger className="bg-[#071428] border-[#1a3a6e] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#071428] border-[#1a3a6e] text-white">
                        {countries.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sector & Format */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Secteur</Label>
                    <Select
                      value={formData.sector}
                      onValueChange={(value) => setFormData({ ...formData, sector: value })}
                    >
                      <SelectTrigger className="bg-[#071428] border-[#1a3a6e] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#071428] border-[#1a3a6e] text-white">
                        {sectors.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select
                      value={formData.format}
                      onValueChange={(value) => setFormData({ ...formData, format: value })}
                    >
                      <SelectTrigger className="bg-[#071428] border-[#1a3a6e] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#071428] border-[#1a3a6e] text-white">
                        {formats.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date & Year */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="camp-date">Date</Label>
                    <Input
                      id="camp-date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="bg-[#071428] border-[#1a3a6e] text-white"
                      placeholder="Ex: Jan 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="camp-year">Annee</Label>
                    <Input
                      id="camp-year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                      className="bg-[#071428] border-[#1a3a6e] text-white"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Statut de publication</Label>
                  <Select
                    value={formData.status || "Brouillon"}
                    onValueChange={(value: "Brouillon" | "En attente" | "Publié") => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="bg-[#071428] border-[#1a3a6e] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#071428] border-[#1a3a6e] text-white">
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className={`inline-flex items-center gap-2 ${
                            s === "Publié" ? "text-green-400" : 
                            s === "En attente" ? "text-yellow-400" : 
                            "text-gray-400"
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              s === "Publié" ? "bg-green-400" : 
                              s === "En attente" ? "bg-yellow-400" : 
                              "bg-gray-400"
                            }`}></span>
                            {s}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Media */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Image principale */}
                <div className="space-y-2">
                  <Label htmlFor="camp-img">Image principale (thumbnail) *</Label>
                  <Input
                    id="camp-img"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="bg-[#071428] border-[#1a3a6e] text-white"
                    placeholder="https://images.unsplash.com/..."
                  />
                  {formData.imageUrl && (
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-[#1a3a6e] mt-2">
                      <img src={formData.imageUrl} alt="Principale" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Images supplementaires */}
                <div className="space-y-2">
                  <Label>Visuels supplementaires</Label>
                  <div className="flex gap-2">
                    <Input
                      value={imageInput}
                      onChange={(e) => setImageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddImage();
                        }
                      }}
                      className="bg-[#071428] border-[#1a3a6e] text-white"
                      placeholder="URL d'une image supplementaire..."
                    />
                    <Button
                      type="button"
                      onClick={handleAddImage}
                      variant="outline"
                      className="border-[#1a3a6e] text-white hover:bg-[#1a3a6e]"
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                  </div>
                  {(formData.images || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(formData.images || []).map((img, idx) => (
                        <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden bg-[#1a3a6e]">
                          <img src={img} alt={`Visuel ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(img)}
                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* URL Video */}
                <div className="space-y-2">
                  <Label htmlFor="camp-video-url">
                    <Video className="h-4 w-4 inline mr-1" />
                    URL de la video (YouTube embed, etc.)
                  </Label>
                  <Input
                    id="camp-video-url"
                    value={formData.videoUrl || ""}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    className="bg-[#071428] border-[#1a3a6e] text-white"
                    placeholder="https://www.youtube.com/embed/..."
                  />
                </div>

                {/* Video checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="camp-video"
                    checked={formData.isVideo || !!(formData.videoUrl && formData.videoUrl.trim())}
                    onCheckedChange={(checked) => setFormData({ ...formData, isVideo: !!checked })}
                  />
                  <Label htmlFor="camp-video" className="cursor-pointer">
                    Cette campagne contient une video
                  </Label>
                </div>
              </div>
            )}

            {/* Step 3: Description & Tags */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Description with WYSIWYG */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <RichTextEditor
                    content={formData.description}
                    onChange={(content) => setFormData({ ...formData, description: content })}
                    placeholder="Decrivez la campagne, son contexte, ses resultats..."
                    className="bg-[#071428] border-[#1a3a6e]"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      className="bg-[#071428] border-[#1a3a6e] text-white"
                      placeholder="Ajouter un tag..."
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      variant="outline"
                      className="border-[#1a3a6e] text-white hover:bg-[#1a3a6e]"
                    >
                      +
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#FF6B35]/20 text-[#FF6B35]"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-white ml-1"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer with Navigation */}
          <DialogFooter className="border-t border-[#1a3a6e] pt-4 flex-row justify-between">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="border-[#1a3a6e] text-white hover:bg-[#1a3a6e] gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Précédent
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-[#1a3a6e] text-white hover:bg-[#1a3a6e]"
              >
                Annuler
              </Button>
              {currentStep < 3 ? (
                <Button 
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={currentStep === 1 && !formData.title.trim()}
                  className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white gap-2"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  type="button"
                  onClick={handleSubmit}
                  className="bg-[#FF6B35] hover:bg-[#e55a2b] text-white"
                >
                  {editingCampaign ? "Enregistrer" : "Ajouter"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
