import { FeaturesGrid } from "@/features/public/landing/FeaturesGrid";
import { GisPreviewSection } from "@/features/public/landing/GisPreviewSection";
import { Hero } from "@/features/public/landing/Hero";
import { HowItWorks } from "@/features/public/landing/HowItWorks";
import { ProblemSection } from "@/features/public/landing/ProblemSection";
import { ProjectSection } from "@/features/public/landing/ProjectSection";
import { RolesSection } from "@/features/public/landing/RolesSection";
import { StatsStrip } from "@/features/public/landing/StatsStrip";
import { TechnologySection } from "@/features/public/landing/TechnologySection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/** Public landing page: hero, public figures, purpose, workflow, features, map preview, roles, stack, project. */
export default function LandingPage() {
  useDocumentTitle("Road safety and incident management");
  return (
    <div className="flex flex-col">
      <Hero />
      <StatsStrip />
      <ProblemSection />
      <HowItWorks />
      <FeaturesGrid />
      <GisPreviewSection />
      <RolesSection />
      <TechnologySection />
      <ProjectSection />
    </div>
  );
}
