import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { HeroSection, FeaturesSection, PreviewSection, PricingTeaser } from "@/components/landing/hero-section"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <section id="features">
          <FeaturesSection />
        </section>
        <PreviewSection />
        <section id="pricing">
          <PricingTeaser />
        </section>
      </main>
      <Footer />
    </div>
  )
}
