"use client";

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video, ExternalLink } from "lucide-react";
import {
  getEmbedUrl,
  isEmbeddableVideoUrl,
  getOriginalVideoUrl,
  getVideoOrientation,
  detectVideoPlatform,
  platformLabelToVideoPlatform,
  getVideoPlatformLabel,
} from "@/lib/video-utils";

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  /** Plateforme déclarée sur la campagne (ex. "Instagram", "Twitter/X"). */
  platformLabel?: string | null;
  /** Format média déclaré (ex. "Reel", "Vidéo") — sert à l'orientation. */
  format?: string | null;
  title: string;
}

// Délai au-delà duquel, si l'iframe n'a pas déclenché `onLoad`, on considère
// que la plateforme refuse l'intégration (X-Frame-Options / frame-ancestors)
// et on bascule vers l'ouverture dans un nouvel onglet.
const EMBED_LOAD_TIMEOUT_MS = 4500;

export function VideoModal({
  open,
  onOpenChange,
  videoUrl,
  platformLabel,
  format,
  title,
}: VideoModalProps) {
  const loadedRef = useRef(false);

  const originalUrl = getOriginalVideoUrl(videoUrl || "");
  const declared = platformLabelToVideoPlatform(platformLabel);
  const detected = detectVideoPlatform(originalUrl);
  const platform = declared !== "unknown" ? declared : detected;
  const displayLabel = getVideoPlatformLabel(platform);
  const embedUrl = getEmbedUrl(videoUrl || "");
  const canEmbed = isEmbeddableVideoUrl(videoUrl || "");
  const orientation = getVideoOrientation(platformLabel, format);
  const isPortrait = orientation === "portrait";

  // Fallback runtime : si l'iframe ne charge pas (refus d'intégration),
  // ouvrir la vidéo dans un nouvel onglet et fermer la modale.
  useEffect(() => {
    if (!open || !canEmbed) return;
    loadedRef.current = false;
    const timer = setTimeout(() => {
      if (!loadedRef.current && originalUrl) {
        window.open(originalUrl, "_blank", "noopener,noreferrer");
        onOpenChange(false);
      }
    }, EMBED_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [open, canEmbed, originalUrl, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-4 w-4 text-[#FF6B35]" />
            {title}
          </DialogTitle>
        </DialogHeader>
        {canEmbed && embedUrl ? (
          isPortrait ? (
            <div className="mx-auto w-full max-w-[360px]">
              <div className="rounded-lg overflow-hidden bg-black">
                <iframe
                  src={embedUrl}
                  title={`Vidéo ${displayLabel}: ${title}`}
                  className="w-full aspect-[9/16] rounded-lg border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  onLoad={() => {
                    loadedRef.current = true;
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden bg-black">
              <iframe
                src={embedUrl}
                title={`Vidéo ${displayLabel}: ${title}`}
                className="w-full aspect-video rounded-lg border-0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                onLoad={() => {
                  loadedRef.current = true;
                }}
              />
            </div>
          )
        ) : (
          <div className="rounded-lg border border-border bg-muted/40 p-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B35]/10">
              <Video className="h-7 w-7 text-[#FF6B35]" />
            </div>
            <p className="text-sm text-muted-foreground">
              Cette vidéo {displayLabel} ne peut pas être intégrée ici.
            </p>
            {originalUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={originalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir sur {displayLabel}
                </a>
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
