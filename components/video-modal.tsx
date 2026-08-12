"use client";

import { useEffect, useRef, useState } from "react";
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

// Délai au-delà duquel on propose une porte de sortie manuelle si l'iframe n'a
// pas déclenché `onLoad`. Le lien de secours s'affiche, mais rien ne s'ouvre
// tout seul (cf. commentaire de l'effet plus bas).
const EMBED_SLOW_MS = 6000;

export function VideoModal({
  open,
  onOpenChange,
  videoUrl,
  platformLabel,
  format,
  title,
}: VideoModalProps) {
  const loadedRef = useRef(false);
  const [slowLoading, setSlowLoading] = useState(false);

  const originalUrl = getOriginalVideoUrl(videoUrl || "");
  // L'URL du fichier fait foi, le libellé déclaré de la campagne n'est qu'un
  // repli — même priorité que la fiche campagne. L'inverse affichait « Ouvrir
  // sur Facebook » et une orientation portrait pour une vidéo hébergée sur Drive.
  const declared = platformLabelToVideoPlatform(platformLabel);
  const detected = detectVideoPlatform(originalUrl);
  const platform = detected !== "unknown" ? detected : declared;
  const displayLabel = getVideoPlatformLabel(platform);
  const embedUrl = getEmbedUrl(videoUrl || "");
  const canEmbed = isEmbeddableVideoUrl(videoUrl || "");
  const orientation = getVideoOrientation(platformLabel, format);
  const isPortrait = orientation === "portrait";

  // L'ancienne version ouvrait automatiquement un nouvel onglet et fermait la
  // modale si l'iframe n'avait pas chargé en 4,5 s. Deux défauts : sur une
  // connexion lente une vidéo parfaitement intégrable était éjectée du lecteur,
  // et le cas qu'on voulait attraper — un fichier Drive privé — déclenche bien
  // `onLoad` (il affiche sa page « demander l'accès »), donc n'était jamais
  // détecté. On se contente désormais d'afficher un lien de secours ; c'est
  // l'utilisateur qui décide de sortir du lecteur.
  useEffect(() => {
    if (!open || !canEmbed) {
      setSlowLoading(false);
      return;
    }
    loadedRef.current = false;
    setSlowLoading(false);
    const timer = setTimeout(() => {
      if (!loadedRef.current) setSlowLoading(true);
    }, EMBED_SLOW_MS);
    return () => clearTimeout(timer);
  }, [open, canEmbed]);

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

        {/* Porte de sortie manuelle quand l'intégration tarde ou reste bloquée
            (fichier Drive non partagé, connexion lente). Rien ne s'ouvre sans
            action de l'utilisateur. */}
        {slowLoading && canEmbed && originalUrl && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="mb-2">
              La vidéo met du temps à s&apos;afficher. Si elle reste vide, le fichier
              n&apos;est peut-être pas partagé publiquement.
            </p>
            <Button asChild variant="outline" size="sm">
              <a href={originalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ouvrir sur {displayLabel}
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
