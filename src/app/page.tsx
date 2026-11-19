import { MainLayout } from "@/layouts";
import {
  AboutSection,
  ContactCTA,
  HealthcareMapSection,
  HeroSection,
  HowItWorks,
  PopularSpecialties,
  PopularSymptoms,
  Statistics,
  TopSpecialists,
} from "@/features/home";

/** Home — composes the landing sections (pages compose components, no logic here). */
export default function HomePage() {
  return (
    <MainLayout transparentNav>
      <HeroSection />
      <PopularSpecialties />
      <HealthcareMapSection />
      <PopularSymptoms />
      <TopSpecialists />
      <HowItWorks />
      <Statistics />
      <AboutSection />
      <ContactCTA />
    </MainLayout>
  );
}
