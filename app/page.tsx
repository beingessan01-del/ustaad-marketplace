import { SiteNavbar } from '@/components/ustad/site-navbar'
import { SiteFooter } from '@/components/ustad/site-footer'
import { HeroSection } from '@/components/ustad/landing/hero-section'
import { ServicesSection } from '@/components/ustad/landing/services-section'
import { HowItWorksSection } from '@/components/ustad/landing/how-it-works-section'
import { TrustSection } from '@/components/ustad/landing/trust-section'

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1">
        <HeroSection />
        <ServicesSection />
        <HowItWorksSection />
        <TrustSection />
      </main>
      <SiteFooter />
    </div>
  )
}
