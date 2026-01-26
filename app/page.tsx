import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/landing/hero-section"
import { ValueProposition } from "@/components/landing/value-proposition"
import { FeaturedBootcamps } from "@/components/landing/featured-bootcamps"
import { Testimonials } from "@/components/landing/testimonials"
import { CTASection } from "@/components/landing/cta-section"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <ValueProposition />
        <FeaturedBootcamps />
        <Testimonials />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
