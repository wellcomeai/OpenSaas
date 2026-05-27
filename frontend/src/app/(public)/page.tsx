import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { WhatCanCreate } from "@/components/landing/WhatCanCreate";
import { WhatInside } from "@/components/landing/WhatInside";
import { AIAgentsSection } from "@/components/landing/AIAgents";
import { HowToStartSection } from "@/components/landing/HowToStart";
import { ManifestoSection } from "@/components/landing/Manifesto";
import { CTA } from "@/components/landing/CTA";

export default function LandingPage() {
  return (
    <>
      <PublicHeader />
      <main>
        <Hero />
        <LiveDemo />
        <WhatYouGet />
        <WhatCanCreate />
        <WhatInside />
        <AIAgentsSection />
        <HowToStartSection />
        <ManifestoSection />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
