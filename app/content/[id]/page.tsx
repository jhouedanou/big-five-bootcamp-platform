"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Share2,
  ExternalLink,
  Calendar,
  Building2,
  Tag,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { sampleContent } from "@/lib/sample-content";

export default function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // For demo, use first content item or find by id
  const content = sampleContent[0];

  const images = [
    "/placeholder.svg?height=600&width=800",
    "/placeholder.svg?height=600&width=800",
    "/placeholder.svg?height=600&width=800",
  ];

  const relatedContent = sampleContent.slice(1, 5);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />

      <main className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a la bibliotheque
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image carousel */}
            <div className="relative aspect-square bg-muted rounded-xl overflow-hidden group">
              <Image
                src={images[currentImageIndex] || "/placeholder.svg"}
                alt={content.title}
                fill
                className="object-cover"
              />

              {/* Navigation arrows */}
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* Image indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentImageIndex
                        ? "bg-[#FF6B35]"
                        : "bg-background/60"
                    }`}
                  />
                ))}
              </div>

              {/* Premium badge */}
              {content.isPremium && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-[#FFD23F] text-[#0A1F44] hover:bg-[#FFD23F]">
                    <Lock className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                </div>
              )}
            </div>

            {/* Title and actions */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground font-[family-name:var(--font-heading)]">
                  {content.title}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {content.brand} - {content.industry}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsLiked(!isLiked)}
                  className={isLiked ? "text-red-500 border-red-500" : ""}
                >
                  <Heart
                    className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`}
                  />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsSaved(!isSaved)}
                  className={isSaved ? "text-[#FF6B35] border-[#FF6B35]" : ""}
                >
                  <Bookmark
                    className={`h-5 w-5 ${isSaved ? "fill-current" : ""}`}
                  />
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-3">Description</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cette campagne innovante de {content.brand} illustre
                  parfaitement les meilleures pratiques du marketing digital
                  moderne. En combinant des visuels percutants avec un message
                  clair et engageant, cette campagne a reussi a captiver son
                  audience cible et a generer un engagement significatif sur les
                  reseaux sociaux.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Les elements cles de cette campagne incluent une utilisation
                  strategique des couleurs de marque, un copywriting emotionnel,
                  et une call-to-action claire qui guide lutilisateur vers
                  laction souhaitee.
                </p>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {content.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-[#FF6B35] hover:text-white transition-colors"
                    >
                      {tag}
                    </Badge>
                  ))}
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-[#FF6B35] hover:text-white transition-colors"
                  >
                    Branding
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-[#FF6B35] hover:text-white transition-colors"
                  >
                    Digital
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-[#FF6B35] hover:text-white transition-colors"
                  >
                    Engagement
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata card */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-lg">Informations</h2>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Marque:</span>
                    <span className="font-medium">{content.brand}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Industrie:</span>
                    <span className="font-medium">{content.industry}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Format:</span>
                    <span className="font-medium">{content.format}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">{content.date}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button className="w-full bg-[#FF6B35] hover:bg-[#e55a2b] text-white">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Voir la source originale
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Related content */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-4">Contenus similaires</h2>
                <div className="space-y-4">
                  {relatedContent.map((item) => (
                    <Link
                      key={item.id}
                      href={`/content/${item.id}`}
                      className="flex gap-3 group"
                    >
                      <div className="relative w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={item.thumbnail || "/placeholder.svg"}
                          alt={item.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-foreground group-hover:text-[#FF6B35] transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.brand}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
