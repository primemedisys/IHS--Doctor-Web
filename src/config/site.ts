import { ROUTES } from "@/constants/routes";
import { env } from "./env";

/** A single navigation link. `icon` is a react-icons component name (resolved at render). */
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

export const siteConfig = {
  name: env.appName,
  shortName: "IHS",
  description:
    "India's most trusted digital healthcare discovery platform — find verified doctors by symptoms, specialties and location.",
  url: env.doctorUrl,
  ogImage: "/og.png",
  locale: "en_IN",
  links: {
    twitter: "https://twitter.com/",
    linkedin: "https://linkedin.com/",
  },
} as const;

/** Primary navigation shown in the public navbar. */
export const mainNav: NavItem[] = [
  { label: "Explore", href: ROUTES.home, icon: "FiCompass" },
  { label: "Find Doctor", href: ROUTES.findDoctor, icon: "FiSearch" },
  { label: "Healthcare Map", href: ROUTES.healthcareMap, icon: "FiMapPin" },
  { label: "About", href: ROUTES.about, icon: "FiInfo" },
  { label: "Contact", href: ROUTES.contact, icon: "FiMail" },
];

/** Grouped links used by the footer. */
export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Platform",
    items: [
      { label: "Find Doctor", href: ROUTES.findDoctor },
      { label: "Healthcare Map", href: ROUTES.healthcareMap },
      { label: "About", href: ROUTES.about },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "Contact", href: ROUTES.contact },
      { label: "Sign In", href: ROUTES.auth.login },
      { label: "Sign Up", href: ROUTES.auth.register },
    ],
  },
];
