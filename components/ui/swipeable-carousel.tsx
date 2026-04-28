"use client"

import * as React from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SwipeableCarouselProps {
  children: React.ReactNode[]
  className?: string
  showIndicators?: boolean
  showArrows?: boolean
  /** Nombre de slides visibles simultanément selon le breakpoint */
  slidesPerView?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
}

export function SwipeableCarousel({
  children,
  className,
  showIndicators = true,
  showArrows = true,
  slidesPerView,
}: SwipeableCarouselProps) {
  const isMultiSlide = !!slidesPerView
  const [currentPerView, setCurrentPerView] = React.useState(
    slidesPerView?.mobile ?? 1
  )

  // Écouter les changements de taille d'écran pour adapter slidesPerView
  React.useEffect(() => {
    if (!slidesPerView) return

    const updatePerView = () => {
      const w = window.innerWidth
      if (w >= 1024) {
        setCurrentPerView(slidesPerView.desktop ?? 4)
      } else if (w >= 768) {
        setCurrentPerView(slidesPerView.tablet ?? 2)
      } else {
        setCurrentPerView(slidesPerView.mobile ?? 1)
      }
    }

    updatePerView()
    window.addEventListener("resize", updatePerView)
    return () => window.removeEventListener("resize", updatePerView)
  }, [slidesPerView])

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: children.length > currentPerView,
    dragFree: false,
    slidesToScroll: isMultiSlide ? currentPerView : 1,
    align: "start",
  })

  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)

  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const scrollTo = React.useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index)
    },
    [emblaApi]
  )

  const onSelect = React.useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  // Quand currentPerView change, réinitialiser Embla
  React.useEffect(() => {
    if (emblaApi) emblaApi.reInit()
  }, [emblaApi, currentPerView])

  React.useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi, onSelect])

  // Calculer la classe CSS pour chaque slide selon le nombre de slides visibles
  const getSlideClassName = () => {
    if (!isMultiSlide) return "flex-[0_0_100%]"
    // Utiliser les valeurs réelles configurées
    const desktop = slidesPerView?.desktop ?? 4
    if (desktop === 3) {
      return "flex-[0_0_100%] md:flex-[0_0_calc(50%-0.5rem)] lg:flex-[0_0_calc(33.333%-0.67rem)]"
    }
    // Classes tailwind pour chaque breakpoint (4 colonnes par défaut)
    return "flex-[0_0_100%] md:flex-[0_0_calc(50%-0.5rem)] lg:flex-[0_0_calc(25%-0.75rem)]"
  }

  const totalSnaps = emblaApi?.scrollSnapList().length ?? children.length

  return (
    <div className={cn("relative group", className)}>
      <div className="overflow-hidden rounded-xl pb-4" ref={emblaRef}>
        <div className={cn("flex touch-pan-y items-stretch", isMultiSlide && "gap-4")}>
          {children.map((child, index) => (
            <div
              key={index}
              className={cn("relative flex min-w-0 flex-col", getSlideClassName())}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {showArrows && children.length > currentPerView && (
        <>
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev && !emblaApi?.internalEngine().options.loop}
            className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-background/80 backdrop-blur-sm p-2.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-all hover:bg-white dark:hover:bg-background/90 hover:scale-110 z-10 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-5 w-5 text-[#0F0F0F] dark:text-white" />
          </button>
          <button
            onClick={scrollNext}
            disabled={!canScrollNext && !emblaApi?.internalEngine().options.loop}
            className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-background/80 backdrop-blur-sm p-2.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 transition-all hover:bg-white dark:hover:bg-background/90 hover:scale-110 z-10 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Suivant"
          >
            <ChevronRight className="h-5 w-5 text-[#0F0F0F] dark:text-white" />
          </button>
        </>
      )}

      {/* Indicators / dots */}
      {showIndicators && totalSnaps > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalSnaps }).map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === selectedIndex
                  ? "bg-[#F2B33D] w-6"
                  : "bg-gray-300 dark:bg-gray-600 w-2 hover:bg-gray-400"
              )}
              aria-label={`Aller au groupe ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
