"use client";

import { useState, useEffect, Suspense } from "react";
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
  ChevronUp,
  ChevronDown,
  Send,
  FileText,
  Image,
  Sparkles,
  Check,
  Upload,
  Crown,
  Users,
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

/**
 * Convertit une URL YouTube standard en URL embed
 * Supporte: youtube.com/watch?v=xxx, youtu.be/xxx, youtube.com/embed/xxx
 */
function convertToYouTubeEmbed(url: string): string {
  if (!url) return "";
  
  // Si c'est déjà une URL embed, la retourner telle quelle
  if (url.includes("/embed/")) {
    return url;
  }
  
  // Extraire l'ID de la vidéo
  let videoId = "";
  
  // Format: youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }
  
  // Format: youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }
  
  // Format: youtube.com/v/VIDEO_ID
  const vMatch = url.match(/youtube\.com\/v\/([^?&]+)/);
  if (vMatch) {
    videoId = vMatch[1];
  }
  
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // Retourner l'URL originale si on ne peut pas la convertir
  return url;
}

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
  accessLevel: "free",
};

function CampaignsPageContent() {
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
      accessLevel: item.accessLevel || "free",
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
    
    // Convertir l'URL YouTube en format embed si nécessaire
    const processedFormData = {
      ...formData,
      videoUrl: formData.videoUrl ? convertToYouTubeEmbed(formData.videoUrl) : "",
    };
    
    if (editingCampaign) {
      await updateCampaign(editingCampaign.id, processedFormData);
    } else {
      await addCampaign(processedFormData);
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
      Telecoms: "bg-blue-100 text-blue-700",
      "E-commerce": "bg-pink-100 text-pink-700",
      "Banque/Finance": "bg-purple-100 text-purple-700",
      FMCG: "bg-orange-100 text-orange-700",
      Tech: "bg-cyan-100 text-cyan-700",
      Energie: "bg-yellow-100 text-yellow-700",
      Industrie: "bg-slate-100 text-slate-700",
    };
    return colors[sector] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-[family-name:var(--font-heading)]">
            Exemples de Campagnes
          </h1>
          <p className="text-gray-500 mt-1">
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
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par titre, marque ou agence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white border-gray-300 text-gray-900">
                <SelectValue placeholder="Filtrer par secteur" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 text-gray-900">
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
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucune campagne trouvee</p>
            </CardContent>
          </Card>
        ) : (
          filteredCampaigns.map((item) => (
            <Card key={item.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
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
                      <h3 className="text-gray-900 font-medium truncate">{item.title}</h3>
                      <p className="text-gray-500 text-sm mt-0.5 truncate">
                        {item.brand && <span>{item.brand}</span>}
                        {item.agency && <span> - {item.agency}</span>}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {/* Badge de statut */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === "Publié" ? "bg-green-100 text-green-700" :
                          item.status === "En attente" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.status === "Publié" ? "bg-green-500" :
                            item.status === "En attente" ? "bg-yellow-500" :
                            "bg-gray-400"
                          }`}></span>
                          {item.status || "Brouillon"}
                        </span>
                        {/* Badge Premium/Gratuit */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.accessLevel === "premium" 
                            ? "bg-amber-100 text-amber-700" 
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {item.accessLevel === "premium" ? (
                            <><Crown className="h-3 w-3" /> Premium</>
                          ) : (
                            <><Users className="h-3 w-3" /> Gratuit</>
                          )}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sectorColor(item.sector)}`}>
                          {item.sector}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <Globe className="h-3 w-3 mr-1" />
                          {item.country}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {item.platform}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {item.format}
                        </span>
                        {item.date && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
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
                      <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border-gray-200 text-gray-900 shadow-lg">
                      <DropdownMenuItem
                        onClick={() => setPreviewCampaign(item)}
                        className="hover:bg-gray-100 cursor-pointer"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Apercu
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePublish(item)}
                        className={`hover:bg-gray-100 cursor-pointer ${
                          item.status === "Publié" ? "text-yellow-600" : "text-green-600"
                        }`}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {item.status === "Publié" ? "Dépublier" : "Publier"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleOpenEdit(item)}
                        className="hover:bg-gray-100 cursor-pointer"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
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
        <DialogContent className="bg-white border-gray-200 text-gray-900 sm:max-w-[600px] max-h-[90vh] overflow-y-auto shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">{previewCampaign?.title}</DialogTitle>
          </DialogHeader>
          {previewCampaign && (() => {
            const allImages = [previewCampaign.imageUrl, ...(previewCampaign.images || [])].filter(Boolean);
            const embedVideoUrl = previewCampaign.videoUrl ? convertToYouTubeEmbed(previewCampaign.videoUrl) : "";
            return (
              <div className="space-y-4">
                {allImages.length > 0 && (
                  <div className="relative rounded-lg overflow-hidden bg-gray-100">
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
                          title="Image précédente"
                          aria-label="Image précédente"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPreviewImageIndex((prev) => (prev + 1) % allImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                          title="Image suivante"
                          aria-label="Image suivante"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {allImages.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setPreviewImageIndex(i)}
                              className={`w-2 h-2 rounded-full ${i === previewImageIndex ? "bg-[#FF6B35]" : "bg-white/50"}`}
                              title={`Aller à l'image ${i + 1}`}
                              aria-label={`Aller à l'image ${i + 1}`}
                            />
                          ))}
                        </div>
                        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                          {previewImageIndex + 1} / {allImages.length}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {embedVideoUrl && (
                  <div className="rounded-lg overflow-hidden">
                    <div className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                      <Video className="h-3 w-3" /> Vidéo
                    </div>
                    <iframe
                      src={embedVideoUrl}
                      title={`Vidéo: ${previewCampaign.title}`}
                      className="w-full aspect-video rounded-lg border border-gray-200"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                )}
                {previewCampaign.description && (
                  <div 
                    className="text-gray-600 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewCampaign.description }}
                  />
                )}
                <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-4">
                  <div>
                    <span className="text-gray-500">Marque:</span>{" "}
                    <span className="text-gray-900 font-medium">{previewCampaign.brand || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Agence:</span>{" "}
                    <span className="text-gray-900 font-medium">{previewCampaign.agency || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Plateforme:</span>{" "}
                    <span className="text-gray-900 font-medium">{previewCampaign.platform}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pays:</span>{" "}
                    <span className="text-gray-900 font-medium">{previewCampaign.country}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Secteur:</span>{" "}
                    <span className="text-gray-900 font-medium">{previewCampaign.sector}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Format:</span>{" "}
                    <span className="text-gray-900 font-medium">{previewCampaign.format}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Date:</span>{" "}
                    <span className="text-gray-900 font-medium">{previewCampaign.date || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Année:</span>{" "}
                    <span className="text-gray-900 font-medium">{previewCampaign.year || "-"}</span>
                  </div>
                </div>
                {previewCampaign.tags.length > 0 && (
                  <div>
                    <span className="text-gray-500 text-sm">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {previewCampaign.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700"
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
        <DialogContent className="bg-white border-gray-200 text-gray-900 sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingCampaign ? "Modifier la campagne" : "Ajouter une campagne"}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {editingCampaign
                ? "Modifiez les informations de la campagne."
                : "Remplissez les informations pour creer une nouvelle campagne."}
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Header */}
          <div className="flex items-center justify-between px-2 py-4 border-b border-gray-200">
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
                        ? "border-primary bg-primary text-white" 
                        : currentStep > step.id 
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-gray-300 text-gray-400"
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
                      currentStep === step.id ? "text-gray-900" : "text-gray-500"
                    )}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < FORM_STEPS.length - 1 && (
                  <div 
                    className={cn(
                      "w-8 sm:w-16 h-0.5 mx-2",
                      currentStep > step.id ? "bg-green-500" : "bg-gray-200"
                    )} 
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 px-1">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="camp-title" className="text-gray-700">Titre *</Label>
                  <Input
                    id="camp-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    placeholder="Ex: MTN Ghana - Mobile Money Campaign"
                  />
                </div>

                {/* Brand & Agency */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="camp-brand" className="text-gray-700">Marque</Label>
                    <Input
                      id="camp-brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      placeholder="Ex: MTN"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="camp-agency" className="text-gray-700">Agence</Label>
                    <Input
                      id="camp-agency"
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      placeholder="Ex: Ogilvy Africa"
                    />
                  </div>
                </div>

                {/* Platform & Country */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700">Plateforme</Label>
                    <Select
                      value={formData.platform}
                      onValueChange={(value) => setFormData({ ...formData, platform: value })}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-900">
                        {platforms.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Pays</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-900">
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
                    <Label className="text-gray-700">Secteur</Label>
                    <Select
                      value={formData.sector}
                      onValueChange={(value) => setFormData({ ...formData, sector: value })}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-900">
                        {sectors.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700">Format</Label>
                    <Select
                      value={formData.format}
                      onValueChange={(value) => setFormData({ ...formData, format: value })}
                    >
                      <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-900">
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
                    <Label htmlFor="camp-date" className="text-gray-700">Date</Label>
                    <Input
                      id="camp-date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      placeholder="Ex: Jan 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="camp-year" className="text-gray-700">Annee</Label>
                    <Input
                      id="camp-year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-gray-700">Statut de publication</Label>
                  <Select
                    value={formData.status || "Brouillon"}
                    onValueChange={(value: "Brouillon" | "En attente" | "Publié") => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className={`inline-flex items-center gap-2 ${
                            s === "Publié" ? "text-green-600" : 
                            s === "En attente" ? "text-yellow-600" : 
                            "text-gray-500"
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              s === "Publié" ? "bg-green-500" : 
                              s === "En attente" ? "bg-yellow-500" : 
                              "bg-gray-400"
                            }`}></span>
                            {s}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Access Level */}
                <div className="space-y-2">
                  <Label className="text-gray-700">Niveau d'accès</Label>
                  <Select
                    value={formData.accessLevel || "free"}
                    onValueChange={(value: "free" | "premium") => setFormData({ ...formData, accessLevel: value })}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                      <SelectItem value="free">
                        <span className="inline-flex items-center gap-2 text-green-600">
                          <Users className="h-4 w-4" />
                          Gratuit - Visible par tous
                        </span>
                      </SelectItem>
                      <SelectItem value="premium">
                        <span className="inline-flex items-center gap-2 text-amber-600">
                          <Crown className="h-4 w-4" />
                          Premium - Réservé aux abonnés
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Les campagnes Premium ne sont pas visibles sur la page Démo.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Media */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Image principale */}
                <div className="space-y-2">
                  <Label htmlFor="camp-img" className="text-gray-700">Image principale (thumbnail) *</Label>
                  <Input
                    id="camp-img"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    placeholder="https://images.unsplash.com/..."
                  />
                  {formData.imageUrl && (
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 mt-2 border border-gray-200">
                      <img src={formData.imageUrl} alt="Principale" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Images supplementaires - Champs répétables */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-700">Visuels supplémentaires (carousel)</Label>
                    <span className="text-xs text-gray-500">
                      {(formData.images || []).length} image{(formData.images || []).length !== 1 ? 's' : ''} ajoutée{(formData.images || []).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {/* Liste des images existantes avec champs éditables */}
                  <div className="space-y-2">
                    {(formData.images || []).map((img, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        {/* Miniature */}
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                          {img ? (
                            <img src={img} alt={`Visuel ${idx + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ImagePlus className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        
                        {/* Numéro et input */}
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium w-6">#{idx + 1}</span>
                          <Input
                            value={img}
                            onChange={(e) => {
                              const newImages = [...(formData.images || [])];
                              newImages[idx] = e.target.value;
                              setFormData({ ...formData, images: newImages });
                            }}
                            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 text-sm"
                            placeholder="URL de l'image..."
                          />
                        </div>
                        
                        {/* Boutons d'action */}
                        <div className="flex items-center gap-1">
                          {/* Monter */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                            onClick={() => {
                              if (idx > 0) {
                                const newImages = [...(formData.images || [])];
                                [newImages[idx - 1], newImages[idx]] = [newImages[idx], newImages[idx - 1]];
                                setFormData({ ...formData, images: newImages });
                              }
                            }}
                            disabled={idx === 0}
                            title="Monter"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          
                          {/* Descendre */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                            onClick={() => {
                              const images = formData.images || [];
                              if (idx < images.length - 1) {
                                const newImages = [...images];
                                [newImages[idx], newImages[idx + 1]] = [newImages[idx + 1], newImages[idx]];
                                setFormData({ ...formData, images: newImages });
                              }
                            }}
                            disabled={idx === (formData.images || []).length - 1}
                            title="Descendre"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          
                          {/* Supprimer */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveImage(img)}
                            title="Supprimer"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Bouton pour ajouter une nouvelle image */}
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
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      placeholder="Coller l'URL d'une nouvelle image..."
                    />
                    <Button
                      type="button"
                      onClick={handleAddImage}
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-100 gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </Button>
                  </div>
                  
                  {/* Bouton pour ajouter un champ vide */}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    onClick={() => {
                      setFormData({ ...formData, images: [...(formData.images || []), ""] });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un champ image
                  </Button>
                  
                  <p className="text-xs text-gray-500">
                    💡 Astuce : Ajoutez plusieurs images pour créer un carousel. Vous pouvez réorganiser l'ordre avec les flèches.
                  </p>
                </div>

                {/* URL Video */}
                <div className="space-y-2">
                  <Label htmlFor="camp-video-url" className="text-gray-700">
                    <Video className="h-4 w-4 inline mr-1" />
                    URL de la vidéo YouTube
                  </Label>
                  <Input
                    id="camp-video-url"
                    value={formData.videoUrl || ""}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                    placeholder="https://www.youtube.com/watch?v=xxxxx ou https://youtu.be/xxxxx"
                  />
                  <p className="text-xs text-gray-500">
                    💡 Collez simplement le lien YouTube - il sera automatiquement converti en format embed.
                  </p>
                  {formData.videoUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-gray-200">
                      <iframe
                        src={convertToYouTubeEmbed(formData.videoUrl)}
                        title="Aperçu vidéo"
                        className="w-full aspect-video"
                        allowFullScreen
                      />
                    </div>
                  )}
                </div>

                {/* Video checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="camp-video"
                    checked={formData.isVideo || !!(formData.videoUrl && formData.videoUrl.trim())}
                    onCheckedChange={(checked) => setFormData({ ...formData, isVideo: !!checked })}
                  />
                  <Label htmlFor="camp-video" className="cursor-pointer text-gray-700">
                    Cette campagne contient une vidéo
                  </Label>
                </div>
              </div>
            )}

            {/* Step 3: Description & Tags */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Description with WYSIWYG */}
                <div className="space-y-2">
                  <Label className="text-gray-700">Description</Label>
                  <RichTextEditor
                    content={formData.description}
                    onChange={(content) => setFormData({ ...formData, description: content })}
                    placeholder="Decrivez la campagne, son contexte, ses resultats..."
                    className="bg-white border-gray-300"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="text-gray-700">Tags</Label>
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
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                      placeholder="Ajouter un tag..."
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      +
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-primary/70 ml-1"
                            title="Supprimer le tag"
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
          <DialogFooter className="border-t border-gray-200 pt-4 flex-row justify-between">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 gap-2"
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
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Annuler
              </Button>
              {currentStep < 3 ? (
                <Button 
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={currentStep === 1 && !formData.title.trim()}
                  className="bg-primary hover:bg-primary/90 text-white gap-2"
                >
                  Suivant
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  type="button"
                  onClick={handleSubmit}
                  className="bg-primary hover:bg-primary/90 text-white"
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

export default function CampaignsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <CampaignsPageContent />
    </Suspense>
  );
}
