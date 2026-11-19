"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Rating from "@mui/material/Rating";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import ButtonBase from "@mui/material/ButtonBase";
import Tooltip from "@mui/material/Tooltip";
import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";
import { MotionConfig, motion } from "framer-motion";
import NextLink from "next/link";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAward,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCamera,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiExternalLink,
  FiEye,
  FiGlobe,
  FiHeart,
  FiMail,
  FiMapPin,
  FiMenu,
  FiMoreHorizontal,
  FiNavigation,
  FiPhone,
  FiPlusSquare,
  FiShield,
  FiSmile,
  FiStar,
  FiUsers,
  FiVideo,
  FiX,
} from "react-icons/fi";
import { siteConfig } from "@/config/site";
import { env } from "@/config/env";
import { DoctorCard } from "@/components/cards";
import { PageContainer } from "@/components/common";
import { EmptyState, Loading } from "@/components/feedback";
import { DoctorAvatar, DoctorsMap, VerifiedBadge } from "@/components/ui";
import { ROUTES } from "@/constants/routes";
import { useDoctorDetail, useRelatedDoctors } from "@/features/doctors/hooks";
import { easeOut, stagger, fadeUp } from "@/theme/motion";
import { formatCurrency, formatRelative } from "@/utils/format";
import {
  directionsUrl,
  displayHost,
  educationCompletionYear,
  formatPersonName,
  hasCoordinates,
  safeHttpUrl,
  sortByYearDesc,
  sortEducationByYearDesc,
  sortExperienceForDisplay,
} from "@/utils/display";
import type {
  AffiliationEntry,
  Clinic,
  Doctor,
  DoctorDetail,
  EducationEntry,
  ExperienceEntry,
  ExpertiseCategory,
  FellowshipEntry,
  GalleryImage,
  MapMarker,
  Review,
} from "@/types/doctor";
import { HeroSlideshow } from "./HeroSlideshow";

type BookingState = { mode: "video" } | { mode: "clinic"; clinic?: Clinic } | null;

/** Identifies each editable block of the portfolio (used by the inline editor). */
export type PortfolioSectionKey =
  | "profile"
  | "photo"
  | "showcaseImage"
  | "heroImages"
  | "about"
  | "affiliations"
  | "specialties"
  | "expertise"
  | "services"
  | "experience"
  | "fellowships"
  | "education"
  | "publications"
  | "awards"
  | "memberships"
  | "testimonials"
  | "gallery"
  | "insurance"
  | "clinics"
  | "faq"
  | "contact";

/**
 * Set by the dashboard preview so each section can render an inline "edit" pencil
 * that opens the matching editor on the template itself. `null` on the public
 * patient page — where the pencils simply don't render.
 */
const PortfolioEditContext = createContext<((key: PortfolioSectionKey) => void) | null>(null);

/** Inline edit pencil shown beside a section heading when in edit mode. */
function SectionEditButton({
  section,
  label = "Edit this section",
  dark = false,
  icon,
  sx,
}: {
  section: PortfolioSectionKey;
  label?: string;
  dark?: boolean;
  icon?: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
  const onEditSection = useContext(PortfolioEditContext);
  if (!onEditSection) return null;
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        aria-label={label}
        onClick={() => onEditSection(section)}
        sx={{
          border: "1px solid",
          borderColor: dark ? "rgba(255,255,255,0.45)" : "divider",
          color: dark ? "common.white" : "secondary.main",
          bgcolor: dark ? "rgba(255,255,255,0.10)" : "background.paper",
          "&:hover": {
            borderColor: dark ? "common.white" : "grey.300",
            bgcolor: dark ? "rgba(255,255,255,0.2)" : "grey.50",
          },
          ...sx,
        }}
      >
        {icon ?? <FiEdit2 size={15} />}
      </IconButton>
    </Tooltip>
  );
}

/**
 * One "⋯" button collecting several section editors into a dropdown, for spots
 * where multiple pencils would pile up (e.g. the "Why Choose" block edits
 * biography, specialties AND the section image from the same corner).
 */
function SectionEditMenu({
  items,
  label = "Edit this section",
  sx,
}: {
  items: { section: PortfolioSectionKey; label: string }[];
  label?: string;
  sx?: SxProps<Theme>;
}) {
  const onEditSection = useContext(PortfolioEditContext);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  if (!onEditSection) return null;
  return (
    <>
      <Tooltip title={label}>
        <IconButton
          size="small"
          aria-label={label}
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            color: "secondary.main",
            bgcolor: "background.paper",
            "&:hover": {
              borderColor: "grey.300",
              bgcolor: "grey.50",
            },
            ...sx,
          }}
        >
          <FiMoreHorizontal size={15} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.section}
            onClick={() => {
              setAnchorEl(null);
              onEditSection(item.section);
            }}
          >
            <ListItemIcon sx={{ color: "secondary.main" }}>
              <FiEdit2 size={14} />
            </ListItemIcon>
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** True inside the dashboard preview (inline editing on). */
function useIsEditing() {
  return useContext(PortfolioEditContext) !== null;
}

/** Shared card surface: subtle border + soft shadow, consistent on every section. */
const cardSx = {
  p: { xs: 2, md: 2.5 },
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  bgcolor: "background.paper",
  boxShadow: "none",
  transition: "border-color 0.2s ease",
  "&:hover": {
    borderColor: "grey.300",
  },
} as const;

/**
 * A portfolio section that fades up once when it scrolls into view (never
 * replays on scroll-back; reduced-motion users get it static via the
 * MotionConfig above). Renders a real <section> with the given id.
 */
function RevealSection({
  id,
  sx,
  children,
}: {
  id?: string;
  sx?: React.ComponentProps<typeof Box>["sx"];
  children: React.ReactNode;
}) {
  return (
    <Box
      component={motion.section}
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-56px 0px" }}
      transition={{ duration: 0.5, ease: easeOut }}
      sx={sx}
    >
      {children}
    </Box>
  );
}

/** One heading style for every portfolio section (overline + title + optional edit control). */
function SectionHeading({
  overline,
  title,
  subtitle,
  edit,
  level = "h2",
}: {
  overline: string;
  title: string;
  subtitle?: string;
  edit?: React.ReactNode;
  /** `h3` for a block nested inside another section (smaller type too). */
  level?: "h2" | "h3";
}) {
  const nested = level === "h3";
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: "flex-end", justifyContent: "space-between", mb: { xs: 2, md: 2.5 } }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1.5 }}>
          {overline}
        </Typography>
        <Typography
          variant="h3"
          component={level}
          sx={{
            fontWeight: 700,
            fontSize: nested ? { xs: "1.2rem", md: "1.4rem" } : { xs: "1.5rem", md: "1.9rem" },
            lineHeight: 1.2,
            mt: 0.25,
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 640, lineHeight: 1.6 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {edit ? <Box sx={{ flexShrink: 0 }}>{edit}</Box> : null}
    </Stack>
  );
}

/** Dashboard-preview placeholder for a section the doctor hasn't filled yet. */
function EmptySectionCard({ message }: { message: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 3, borderRadius: 2, borderStyle: "dashed", textAlign: "center", color: "text.secondary" }}
    >
      <Typography variant="body2">{message}</Typography>
    </Paper>
  );
}

/** One entry of a vertical timeline: a dot + connecting rail, then a full-width card. */
function TimelineItem({
  last,
  accent,
  children,
}: {
  last: boolean;
  accent: "primary" | "secondary";
  children: React.ReactNode;
}) {
  return (
    <Box
      component={motion.li}
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-40px 0px" }}
      transition={{ duration: 0.45, ease: easeOut }}
      sx={{ display: "flex", gap: { xs: 1.5, md: 2.5 }, listStyle: "none" }}
    >
      <Box aria-hidden sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 3, flexShrink: 0 }}>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            bgcolor: "background.paper",
            border: "3px solid",
            borderColor: `${accent}.main`,
          }}
        />
        {!last && <Box sx={{ width: 2, flex: 1, bgcolor: "divider", mt: 1 }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, pb: last ? 0 : 1.75 }}>{children}</Box>
    </Box>
  );
}

/** "2016 – Present", "2009 – 2014", "2010" (no end saved), or null when no years were saved. */
function experienceRange(item: ExperienceEntry): string | null {
  const start = item.startYear > 0 ? item.startYear : null;
  const end = item.isCurrent ? "Present" : item.endYear && item.endYear > 0 ? item.endYear : null;
  if (start && end) return `${start} – ${end}`;
  if (start) return String(start);
  if (end) return item.isCurrent ? "Present" : `Until ${end}`;
  return null;
}

/** "2001 – 2006", or the single completion/start label, or null. */
function educationRange(item: EducationEntry): string | null {
  const done = educationCompletionYear(item);
  if (item.yearFrom && done && item.yearFrom !== done) return `${item.yearFrom} – ${done}`;
  return educationYearLabel(item);
}

/** Public route entry: fetch by slug, then render the shared view. */
export function DoctorProfile({ slug }: { slug: string }) {
  const { data: doctor, isLoading } = useDoctorDetail(slug);
  const { data: related = [] } = useRelatedDoctors(slug);
  // This page renders inside MainLayout, whose navbar is sticky: the portfolio
  // capsule must stick below it, not slide underneath it.
  const siteHeaderHeight = useStickySiteHeaderHeight();

  if (isLoading) {
    return (
      <PageContainer>
        <Loading label="Loading doctor profile…" />
      </PageContainer>
    );
  }

  if (!doctor) {
    return (
      <PageContainer maxWidth="md">
        <EmptyState
          icon="FiUserX"
          title="Doctor not found"
          description="This profile may have moved or is no longer listed."
          action={
            <Button component={NextLink} href={ROUTES.findDoctor} variant="contained">
              Find doctors
            </Button>
          }
        />
      </PageContainer>
    );
  }

  /**
   * Real bookings happen in the patient app (it owns the patient session, the
   * login/profile gate and the booking API), so a visitor is sent to its
   * existing `/book/[slug]` page with the chosen mode — and clinic — already
   * selected, exactly as the patient site's own profile does.
   */
  const book = (s: NonNullable<BookingState>) => {
    const params = new URLSearchParams({ mode: s.mode });
    if (s.mode === "clinic" && s.clinic) params.set("clinic", s.clinic.id);
    window.location.assign(`${env.patientUrl}/book/${doctor.slug}?${params.toString()}`);
  };

  return <DoctorProfileView doctor={doctor} related={related} onBook={book} chromeOffset={siteHeaderHeight} />;
}

/**
 * Live height of the site's sticky navbar (MainLayout), or 0 when there is
 * none. Measured rather than hard-coded: the bar is taller on phones than on
 * wider screens, and a ResizeObserver keeps it right across breakpoints.
 */
function useStickySiteHeaderHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("header.MuiAppBar-positionSticky");
    if (!header) return;
    const update = () => setHeight(Math.round(header.getBoundingClientRect().height));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return height;
}

/**
 * Presentation copy of the payload: formatted name, and every year-based list
 * newest-first by ITS OWN year field (education: completion, experience:
 * current then end/start, fellowships: completion, awards: award year,
 * memberships: joining year, publications: publication year), current
 * affiliations first. Undated entries go last; ties keep the saved order.
 * Sorting is display-only — stored order is untouched. (The API already sends
 * this order; re-sorting here keeps older payloads and the mobile shape safe.)
 */
function toDisplayDoctor(doctor: DoctorDetail): DoctorDetail {
  return {
    ...doctor,
    name: formatPersonName(doctor.name) || doctor.name,
    education: sortEducationByYearDesc(doctor.education),
    experience: sortExperienceForDisplay(doctor.experience),
    fellowships: sortByYearDesc(doctor.fellowships, (f) => f.endYear),
    awards: sortByYearDesc(doctor.awards, (a) => a.awardYear),
    memberships: sortByYearDesc(doctor.memberships, (m) => m.sinceYear),
    publications: sortByYearDesc(doctor.publications, (p) => p.year),
    affiliations: sortByYearDesc(doctor.affiliations, (a) => a.startYear).sort(
      (a, b) => Number(b.isCurrent) - Number(a.isCurrent),
    ),
  };
}

/** "Class of 2011" from the completion year; "Started 2004" if only that was given. */
function educationYearLabel(item: EducationEntry): string | null {
  const done = educationCompletionYear(item);
  if (done) return `Class of ${done}`;
  if (item.yearFrom) return `Started ${item.yearFrom}`;
  return null;
}

/**
 * The presentational portfolio — the exact design patients see on the public
 * `/doctors/[slug]` page, shared with the doctor's own dashboard preview.
 *
 * In `preview` mode nothing about the layout changes (so a doctor sees precisely
 * how patients view them), except: booking actions become no-ops, the floating
 * nav capsule is pinned inline (not sticky, so it never fights the dashboard
 * app-bar), and its primary action becomes an "Edit portfolio" button wired to
 * `onEdit`.
 */
export function DoctorProfileView({
  doctor: rawDoctor,
  related = [],
  preview = false,
  onEdit,
  onEditSection,
  onBook,
  chromeOffset = 0,
}: {
  doctor: DoctorDetail;
  related?: Doctor[];
  preview?: boolean;
  onEdit?: () => void;
  /** Starts a booking (the patient app's login/profile gate → /book/[slug]). */
  onBook?: (s: NonNullable<BookingState>) => void;
  /** When set, each section shows an inline edit pencil that calls this. */
  onEditSection?: (key: PortfolioSectionKey) => void;
  /**
   * Height (px) of a sticky site header rendered ABOVE the portfolio, if any.
   * The nav capsule then sticks just below that header (instead of sliding
   * under it) and section anchors clear both bars. 0 on a chrome-free page.
   */
  chromeOffset?: number;
}) {
  // Display-only shaping: readable name casing and newest-first education.
  // The stored values (and anything sent back to the API) are untouched.
  const doctor = useMemo(() => toDisplayDoctor(rawDoctor), [rawDoctor]);

  const fees = [
    doctor.onlineConsult ? doctor.onlineFee : null,
    ...doctor.clinics.map((c) => c.fee),
  ].filter((f): f is number => f != null && f > 0);
  const minFee = fees.length ? Math.min(...fees) : 0;
  const canBook = doctor.onlineConsult || doctor.clinics.length > 0;

  const book = (s: NonNullable<BookingState>) => {
    if (preview || !onBook) return;
    onBook(s);
  };

  // In-page navigation: every section carries scrollMarginTop, so a plain
  // smooth scrollIntoView lands it below the floating nav — no timed "fallback"
  // jump that would fight a user who keeps scrolling.
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PortfolioEditContext.Provider value={onEditSection ?? null}>
    <MotionConfig reducedMotion="user">
      <Box
        sx={{
          bgcolor: "background.default",
          minHeight: "100vh",
          // Read by the sticky nav and every section's scroll margin.
          [CHROME_VAR]: `${Math.max(0, chromeOffset)}px`,
        }}
      >
        {/* Sticky floating navigation capsule */}
        <PortfolioHeader
          doctor={doctor}
          scrollToSection={scrollToSection}
          preview={preview}
          onEdit={onEdit}
          chromeOffset={chromeOffset}
        />

        {/* 1. Hero (doctor-managed background slideshow) + key stats */}
        <PortfolioHero doctor={doctor} minFee={minFee} scrollToSection={scrollToSection} onBook={book} />
        <MetricOverview doctor={doctor} minFee={minFee} />

        {/*
          Fixed top-to-bottom order (one full-width section per row):
          About → Appointment options → Current Affiliations →
          Specialization & Expertise → Professional Experience → Fellowships &
          Training → Education → Procedures & Treatments → Awards →
          Professional Memberships → Research & Publications → Clinical
          Gallery → Patient Feedback / Reviews → Contact Details (phone/email,
          clinics & directions, insurance, FAQs) → portfolio footer. Every
          block hides itself when the doctor has no data for it (the dashboard
          preview shows an "add" placeholder instead), so a sparse profile
          never crashes or shows invented content.
        */}
        <Container maxWidth="lg" sx={{ mt: { xs: 4, md: 5 } }}>
          <Stack spacing={{ xs: 5, md: 7 }}>
            {/* 2. About the Doctor */}
            <AboutSection doctor={doctor} />

            {/* 3. Appointment / consultation options — video + clinic cards */}
            <BookingSection doctor={doctor} canBook={canBook} onBook={book} />

            {/* 4. Current Affiliations */}
            <AffiliationsSection doctor={doctor} />

            {/* 5. Specialization & Expertise */}
            <ExpertiseSection doctor={doctor} />

            {/* 6. Professional Experience — one full-width card per row */}
            <ExperienceSection doctor={doctor} />

            {/* 7. Fellowships & Advanced Training — newest completion first */}
            <FellowshipsSection doctor={doctor} />

            {/* 8. Education & Qualifications — newest completion year first */}
            <EducationSection doctor={doctor} />

            {/* 9. Procedures & Treatments */}
            <ProceduresSection doctor={doctor} />

            {/* 10. Awards & Achievements */}
            <AwardsSection doctor={doctor} />

            {/* 11. Professional Memberships */}
            <MembershipsSection doctor={doctor} />

            {/* 12. Research & Publications */}
            <PublicationsSection doctor={doctor} />

            {/* 13. Clinical Gallery */}
            <GallerySection doctor={doctor} />

            {/* 14. Patient Feedback / Reviews */}
            <TestimonialsSection doctor={doctor} />
            {doctor.reviews.length > 0 && <PatientTestimonials reviews={doctor.reviews} />}

            {/* 15. Contact Details — phone/email, links, clinics & directions, insurance, FAQs */}
            <ContactSection doctor={doctor} />

            {/* Similar Specialists (hidden in preview) */}
            {!preview && related.length > 0 && (
              <motion.section
                variants={stagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-64px 0px" }}
              >
                <motion.div variants={fadeUp}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 3 }}>
                    <FiUsers size={22} style={{ color: "#102B5C" }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      Similar Specialists
                    </Typography>
                  </Stack>
                </motion.div>
                <Grid container spacing={3}>
                  {related.map((r) => (
                    <Grid key={r.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <motion.div variants={fadeUp} style={{ height: "100%" }}>
                        <DoctorCard doctor={r} />
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </motion.section>
            )}
          </Stack>
        </Container>

        {/* 16. Compact portfolio footer */}
        <PortfolioFooter doctor={doctor} canBook={canBook} scrollToSection={scrollToSection} />
      </Box>
    </MotionConfig>
    </PortfolioEditContext.Provider>
  );
}

/** Which optional sections have saved data (drives the nav, footer and empty states). */
function sectionPresence(doctor: DoctorDetail) {
  const expertise = doctor.expertise ?? [];
  const hasDirectContact = Boolean(doctor.publicPhone || doctor.publicEmail || (doctor.links?.length ?? 0) > 0);
  const canBook = doctor.onlineConsult || doctor.clinics.length > 0;
  return {
    about: Boolean(
      doctor.about ||
        doctor.shortIntro ||
        doctor.careerSummary ||
        doctor.practicePhilosophy ||
        expertise.some((e) => e.category === "interest"),
    ),
    book: canBook,
    affiliations: (doctor.affiliations?.length ?? 0) > 0,
    expertise:
      (doctor.specialties?.length ?? 0) > 0 ||
      Boolean(doctor.specialtyName) ||
      (doctor.subSpecializations?.length ?? 0) > 0 ||
      expertise.some((e) => e.category !== "interest") ||
      (doctor.symptoms?.length ?? 0) > 0,
    experience: (doctor.experience?.length ?? 0) > 0,
    fellowships: (doctor.fellowships?.length ?? 0) > 0,
    education: (doctor.education?.length ?? 0) > 0,
    procedures: (doctor.services?.length ?? 0) > 0,
    awards: (doctor.awards?.length ?? 0) > 0,
    memberships: (doctor.memberships?.length ?? 0) > 0,
    publications: (doctor.publications?.length ?? 0) > 0,
    gallery: (doctor.gallery?.length ?? 0) > 0,
    feedback: (doctor.testimonials?.length ?? 0) > 0 || doctor.reviews.length > 0,
    contact:
      hasDirectContact ||
      doctor.clinics.length > 0 ||
      (doctor.insurances?.length ?? 0) > 0 ||
      (doctor.faqs?.length ?? 0) > 0,
  };
}

type NavLink = { id: string; label: string; primary: boolean };

/**
 * Floating nav geometry, shared by the nav and the hero so they can't drift
 * apart: the capsule sticks NAV_OFFSET px from the top and is exactly
 * NAV_HEIGHT px tall. The hero is pulled up under the nav's layout box and
 * starts its content NAV_OFFSET + NAV_HEIGHT + a small gap below the page top,
 * so the capsule never covers the name, facts or buttons.
 *
 * When a sticky site header sits above the portfolio (`chromeOffset`), its
 * height is exposed as CHROME_VAR: the capsule sticks below it and every
 * section's scroll margin clears header + capsule, so anchors never land a
 * heading underneath either bar.
 */
const NAV_OFFSET = 12;
const NAV_HEIGHT = 56;
const HERO_CONTENT_GAP = { xs: 20, md: 32 };
const CHROME_VAR = "--portfolio-chrome";
/** Where an anchored section's top lands: below any site header + the capsule, with breathing room. */
const SECTION_SCROLL_MARGIN = `calc(var(${CHROME_VAR}, 0px) + ${NAV_OFFSET + NAV_HEIGHT + 52}px)`;

/**
 * In-page nav entries, in section order, only for sections that will render.
 * `primary` links show in the desktop bar; the menu (phones/tablets, and the
 * footer) lists them all.
 */
function portfolioNavLinks(doctor: DoctorDetail): NavLink[] {
  const has = sectionPresence(doctor);
  const links: (NavLink & { show: boolean })[] = [
    { id: "about", label: "About", primary: true, show: has.about },
    { id: "book", label: "Appointments", primary: false, show: has.book },
    { id: "affiliations", label: "Affiliations", primary: false, show: has.affiliations },
    { id: "expertise", label: "Expertise", primary: true, show: has.expertise },
    { id: "experience", label: "Experience", primary: true, show: has.experience },
    { id: "fellowships", label: "Fellowships", primary: false, show: has.fellowships },
    { id: "education", label: "Education", primary: true, show: has.education },
    { id: "procedures", label: "Procedures", primary: false, show: has.procedures },
    { id: "awards", label: "Awards", primary: true, show: has.awards },
    { id: "memberships", label: "Memberships", primary: false, show: has.memberships },
    { id: "publications", label: "Research", primary: true, show: has.publications },
    { id: "gallery", label: "Gallery", primary: false, show: has.gallery },
    { id: "feedback", label: "Feedback", primary: false, show: has.feedback },
    { id: "contact", label: "Contact", primary: true, show: has.contact },
  ];
  return links.filter((l) => l.show).map((l) => ({ id: l.id, label: l.label, primary: l.primary }));
}

/**
 * The id of the section currently under the nav bar, for the active-link
 * state. One IntersectionObserver watches every section; the first one in
 * page order that crosses the band just below the nav wins.
 */
function useActiveSection(ids: string[], chromeOffset = 0): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");
  const topInset = Math.max(0, chromeOffset) + 112;
  useEffect(() => {
    const order = key ? key.split(",") : [];
    const elements = order.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (!elements.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = order.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      // A band from just below the floating nav (and any site header above
      // it) to 45% down the viewport.
      { rootMargin: `-${topInset}px 0px -55% 0px`, threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key, topInset]);
  return active;
}

/** Text link in the nav bar: underline grows in on hover/focus and stays on the active section. */
const navLinkSx = {
  position: "relative",
  color: "text.secondary",
  fontWeight: 700,
  textTransform: "none",
  fontSize: "0.88rem",
  px: 1.25,
  py: 0.75,
  minWidth: 0,
  borderRadius: "999px",
  transition: "color 0.2s ease, background-color 0.2s ease",
  "&::after": {
    content: '""',
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 3,
    height: 2,
    borderRadius: 2,
    bgcolor: "primary.main",
    transform: "scaleX(0)",
    transformOrigin: "center",
    transition: "transform 0.22s ease",
  },
  "&:hover, &:focus-visible": { color: "text.primary", bgcolor: "transparent" },
  "&:hover::after, &:focus-visible::after, &[aria-current='true']::after": { transform: "scaleX(1)" },
  "&[aria-current='true']": { color: "primary.main" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.light", outlineOffset: 2 },
  "@media (prefers-reduced-motion: reduce)": { transition: "none", "&::after": { transition: "none" } },
} as const;

/** Sticky floating navigation capsule — light, translucent, readable over the hero. */
function PortfolioHeader({
  doctor,
  scrollToSection,
  preview = false,
  onEdit,
  chromeOffset = 0,
}: {
  doctor: DoctorDetail;
  scrollToSection: (id: string) => void;
  preview?: boolean;
  onEdit?: () => void;
  chromeOffset?: number;
}) {
  const nameParts = doctor.name.replace(/^Dr\.?\s*/i, "").split(" ");
  const lastName = nameParts[nameParts.length - 1];
  const links = portfolioNavLinks(doctor);
  const active = useActiveSection(links.map((l) => l.id), chromeOffset);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const primaryLinks = links.filter((l) => l.primary);
  const go = (id: string) => {
    setMenuAnchor(null);
    scrollToSection(id);
  };

  return (
    <Box
      component="nav"
      aria-label={`${doctor.name} — portfolio sections`}
      sx={{
        // Both modes keep the capsule floating over the top of the hero (the
        // hero is pulled up under it). On the public page it also sticks to
        // the viewport; in preview it stays `relative` so it never slides under
        // the dashboard shell's own fixed app-bar, but the alignment is identical.
        // Below a sticky site header it sticks under that header, not behind it.
        position: preview ? "relative" : "sticky",
        top: `calc(var(${CHROME_VAR}, 0px) + ${NAV_OFFSET}px)`,
        zIndex: 1000,
        width: "100%",
        height: NAV_HEIGHT,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            borderRadius: "999px",
            bgcolor: "background.paper",
            color: "text.primary",
            pl: { xs: 2, md: 3 },
            pr: { xs: 1, md: 1.25 },
            height: NAV_HEIGHT,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 1px 2px rgba(16, 24, 40, 0.06)",
          }}
        >
          {/* Logo */}
          <Box
            component={NextLink}
            href={preview ? ROUTES.dashboard.portfolio : ROUTES.findDoctor}
            aria-label={preview ? "Back to my portfolio" : "Find a doctor"}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontWeight: 700,
              letterSpacing: 1.5,
              fontSize: { xs: "0.95rem", sm: "1.05rem" },
              color: "text.primary",
              textDecoration: "none",
              whiteSpace: "nowrap",
              minWidth: 0,
              borderRadius: 1,
              "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.light", outlineOffset: 2 },
            }}
          >
            <FiActivity style={{ color: "#102B5C", flexShrink: 0 }} />
            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              DR.{lastName.toUpperCase()}
            </Box>
          </Box>

          {/* Links — desktop */}
          <Stack direction="row" spacing={0.25} sx={{ alignItems: "center", display: { xs: "none", lg: "flex" } }}>
            {primaryLinks.map((link) => (
              <Button
                key={link.id}
                onClick={() => go(link.id)}
                aria-current={active === link.id ? "true" : undefined}
                disableRipple
                sx={navLinkSx}
              >
                {link.label}
              </Button>
            ))}
          </Stack>

          {/* Actions */}
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexShrink: 0 }}>
            {preview ? (
              <Button
                variant="contained"
                size="medium"
                startIcon={<FiEdit2 />}
                onClick={onEdit}
                sx={{
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  borderRadius: "999px",
                  fontWeight: 700,
                  px: { xs: 2, sm: 2.75 },
                  py: 0.9,
                  fontSize: "0.88rem",
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "primary.dark", boxShadow: "none" },
                }}
              >
                Full Editor
              </Button>
            ) : (
              <Button
                variant="contained"
                size="medium"
                startIcon={<FiCalendar />}
                onClick={() => go(doctor.onlineConsult || doctor.clinics.length > 0 ? "book" : "contact")}
                sx={{
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  borderRadius: "999px",
                  fontWeight: 700,
                  px: { xs: 2, sm: 2.75 },
                  py: 0.9,
                  fontSize: "0.88rem",
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  boxShadow: "none",
                  "&:hover": { bgcolor: "primary.dark", boxShadow: "none" },
                  "&:focus-visible": { outline: "3px solid", outlineColor: "secondary.light", outlineOffset: 2 },
                }}
              >
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                  Book Appointment
                </Box>
                <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                  Book
                </Box>
              </Button>
            )}
            {links.length > 0 && (
              <>
                <Tooltip title="All sections">
                  <IconButton
                    aria-label="Open the section menu"
                    aria-haspopup="true"
                    aria-expanded={menuAnchor ? "true" : undefined}
                    aria-controls={menuAnchor ? "portfolio-section-menu" : undefined}
                    onClick={(e) => setMenuAnchor(e.currentTarget)}
                    sx={{
                      display: { xs: "inline-flex", lg: primaryLinks.length < links.length ? "inline-flex" : "none" },
                      color: "text.primary",
                      width: 40,
                      height: 40,
                    }}
                  >
                    <FiMenu size={18} />
                  </IconButton>
                </Tooltip>
                <Menu
                  id="portfolio-section-menu"
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: 2 } } }}
                >
                  {links.map((link) => (
                    <MenuItem
                      key={link.id}
                      selected={active === link.id}
                      aria-current={active === link.id ? "true" : undefined}
                      onClick={() => go(link.id)}
                      sx={{ fontWeight: active === link.id ? 700 : 600, minHeight: 44 }}
                    >
                      {link.label}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

/** Primary/secondary hero buttons: calm, pill-shaped, visible focus ring. */
const heroPrimaryBtnSx = {
  fontWeight: 700,
  borderRadius: "999px",
  px: 3.5,
  py: 1.5,
  textTransform: "none",
  whiteSpace: "nowrap",
  width: { xs: "100%", sm: "auto" },
  boxShadow: "none",
  "&:hover": { boxShadow: "none" },
  "&:focus-visible": { outline: "3px solid", outlineColor: "secondary.light", outlineOffset: 2 },
} as const;

const heroSecondaryBtnSx = {
  fontWeight: 700,
  borderRadius: "999px",
  px: 3.5,
  py: 1.5,
  textTransform: "none",
  whiteSpace: "nowrap",
  width: { xs: "100%", sm: "auto" },
  bgcolor: "background.paper",
  "&:focus-visible": { outline: "3px solid", outlineColor: "secondary.light", outlineOffset: 2 },
} as const;

/** One icon + text fact line in the hero (qualifications, workplace, …). */
function HeroFact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
          bgcolor: "grey.100",
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ color: "text.primary", fontWeight: 600, lineHeight: 1.45, pt: 0.5, minWidth: 0, wordBreak: "break-word" }}>
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * The hero portrait: a square-cornered 4:5 frame (subtle border, soft shadow,
 * offset accent outline) with `object-fit: cover` so a photo is never
 * stretched. Without a photo — or if it fails to load — the doctor's initials
 * fill the frame instead of a broken image.
 */
function PortraitFrame({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photoUrl) && !failed;
  return (
    <Box sx={{ position: "relative", width: { xs: 200, sm: 250, md: 290 }, aspectRatio: "4 / 5" }}>
      {/* Offset accent outline — decorative depth behind the frame. */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          transform: "translate(14px, 14px)",
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "grey.200",
        }}
      />
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: 1.5,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 4px 12px rgba(16, 24, 40, 0.06)",
        }}
      >
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            onError={() => setFailed(true)}
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              bgcolor: "grey.50",
            }}
          >
            <DoctorAvatar
              name={name}
              size={120}
              sx={{ borderRadius: 1.5, boxShadow: "none", bgcolor: "primary.main" }}
            />
          </Box>
        )}
      </Box>
      <SectionEditButton
        section="photo"
        label="Change profile photo"
        icon={<FiCamera size={15} />}
        sx={{ position: "absolute", top: 8, right: 8, zIndex: 5 }}
      />
    </Box>
  );
}

/**
 * Hero: a light, near-white surface with the doctor's own 1–3 background images
 * crossfading softly behind a white veil (HeroSlideshow), and every line of
 * text taken from the saved profile — nothing is filled in when a field is
 * blank. Without images it falls back to a quiet tinted background.
 */
function PortfolioHero({
  doctor,
  minFee,
  scrollToSection,
  onBook,
}: {
  doctor: DoctorDetail;
  minFee: number;
  scrollToSection: (id: string) => void;
  onBook: (s: NonNullable<BookingState>) => void;
}) {
  const startBooking = () =>
    doctor.onlineConsult
      ? onBook({ mode: "video" })
      : doctor.clinics[0] && onBook({ mode: "clinic", clinic: doctor.clinics[0] });
  const canBook = doctor.onlineConsult || doctor.clinics.length > 0;

  const heroImages = doctor.heroImageUrls ?? [];
  const specialty = doctor.specialties?.length
    ? doctor.specialties.map((s) => s.name).join(" · ")
    : doctor.specialtyName;
  const headline = doctor.headline || (doctor.specialtyName ? `${doctor.specialtyName} Specialist` : "");
  const qualifications = doctor.qualifications.filter(Boolean).join(", ");
  const workplace = [doctor.hospital, doctor.city].filter(Boolean).join(", ");
  const intro = doctor.shortIntro || doctor.practicePhilosophy || doctor.about || "";

  return (
    <Box
      component="section"
      aria-label={`${doctor.name} — profile overview`}
      sx={{
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        bgcolor: "grey.50",
        borderBottom: "1px solid",
        borderColor: "divider",
        // The hero is pulled up under the nav's layout box (so its background
        // runs behind the floating capsule) and its content starts just below
        // the capsule's visual bottom edge — derived from the nav's own size.
        mt: `-${NAV_HEIGHT}px`,
        pt: {
          xs: `${NAV_OFFSET + NAV_HEIGHT + HERO_CONTENT_GAP.xs}px`,
          md: `${NAV_OFFSET + NAV_HEIGHT + HERO_CONTENT_GAP.md}px`,
        },
        pb: { xs: 8, md: 10 }, // keeps room for the stats bar that overlaps the bottom edge
      }}
    >
      {heroImages.length > 0 && (
        // The backdrop and portrait stay fixed — no cursor-driven movement.
        <Box aria-hidden sx={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
          <HeroSlideshow images={heroImages} />
        </Box>
      )}
      {heroImages.length > 0 && (
        // Readability veil — kept light so the doctor's photos stay clearly
        // visible: strongest behind the text column, fading toward the
        // portrait side, with a faint neutral tint (not pure white) so the
        // images don't wash out. On phones the text spans the full width, so
        // a uniform, slightly stronger veil keeps it readable.
        <Box
          aria-hidden
          sx={(t) => ({
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            background: {
              xs: `linear-gradient(180deg, ${alpha(t.palette.background.default, 0.7)} 0%, ${alpha(
                t.palette.background.default,
                0.8,
              )} 100%)`,
              md: `linear-gradient(90deg, ${alpha(t.palette.background.default, 0.86)} 0%, ${alpha(
                t.palette.background.default,
                0.7,
              )} 46%, ${alpha(t.palette.background.default, 0.18)} 100%)`,
            },
            // Neutral depth so a bright photo never reads as a white sheet.
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, ${alpha(t.palette.common.black, 0)} 55%, ${alpha(
                t.palette.common.black,
                0.06,
              )} 100%)`,
            },
          })}
        />
      )}

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 2 }}>
        <Box sx={{ position: "absolute", top: -8, right: 16, zIndex: 4 }}>
          <SectionEditMenu
            label="Edit the hero"
            items={[
              { section: "profile", label: "Edit name, headline & bio" },
              { section: "heroImages", label: "Change background images" },
            ]}
          />
        </Box>
        <Grid container spacing={{ xs: 3, md: 5 }} sx={{ alignItems: "center" }}>
          {/* Text column */}
          <Grid size={{ xs: 12, md: 7 }}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut }}
            >
              {(specialty || doctor.verified) && (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center", mb: 2 }}>
                  {specialty ? (
                    <Chip
                      label={specialty}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        borderRadius: "999px",
                        color: "text.primary",
                        bgcolor: "grey.100",
                        maxWidth: "100%",
                      }}
                    />
                  ) : null}
                  {doctor.verified && <VerifiedBadge />}
                </Stack>
              )}

              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "2rem", sm: "2.6rem", md: "3.1rem" },
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: "text.primary",
                  wordBreak: "break-word",
                }}
              >
                {doctor.name}
              </Typography>

              {headline ? (
                <Typography
                  component="p"
                  sx={{ mt: 1, fontSize: { xs: "1.05rem", md: "1.2rem" }, fontWeight: 500, color: "text.secondary" }}
                >
                  {headline}
                </Typography>
              ) : null}

              {(qualifications || workplace || doctor.experienceYears > 0) && (
                <Stack spacing={1} sx={{ mt: 2.25 }}>
                  {qualifications ? <HeroFact icon={<FiAward size={15} />}>{qualifications}</HeroFact> : null}
                  {workplace ? <HeroFact icon={<FiMapPin size={15} />}>{workplace}</HeroFact> : null}
                  {doctor.experienceYears > 0 ? (
                    <HeroFact icon={<FiBriefcase size={15} />}>{doctor.experienceYears}+ years of experience</HeroFact>
                  ) : null}
                </Stack>
              )}

              {intro ? (
                <Typography
                  sx={{
                    mt: 2.25,
                    color: "text.secondary",
                    lineHeight: 1.65,
                    maxWidth: 560,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {intro}
                </Typography>
              ) : null}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
                {canBook && (
                  <Button
                    size="large"
                    variant="contained"
                    color="primary"
                    startIcon={<FiCalendar />}
                    onClick={startBooking}
                    sx={heroPrimaryBtnSx}
                  >
                    Book Appointment{minFee > 0 ? ` · ${formatCurrency(minFee)}` : ""}
                  </Button>
                )}
                <Button
                  size="large"
                  variant="outlined"
                  color="secondary"
                  startIcon={<FiMail />}
                  onClick={() => scrollToSection("contact")}
                  sx={heroSecondaryBtnSx}
                >
                  Contact Details
                </Button>
              </Stack>

              {doctor.reviewsCount > 0 && (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 3 }}>
                  <FiStar fill="#F4B400" color="#F4B400" size={16} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {doctor.rating.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    from {doctor.reviewsCount} patient review{doctor.reviewsCount === 1 ? "" : "s"}
                  </Typography>
                </Stack>
              )}
            </motion.div>
          </Grid>

          {/* Photo column — first on phones */}
          <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex", justifyContent: "center", order: { xs: -1, md: 0 } }}>
            {/* Fade in only: the portrait never moves (no slide, float or parallax). */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: easeOut, delay: 0.1 }}
            >
              <PortraitFrame name={doctor.name} photoUrl={doctor.photoUrl} />
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}


/**
 * Key-figures bar overlapping the hero's bottom edge. Each figure shows only
 * when the profile backs it — no "100% verified" for an unverified doctor, no
 * "Free" when a fee simply wasn't set.
 */
function MetricOverview({ doctor, minFee }: { doctor: DoctorDetail; minFee: number }) {
  const stats = [
    doctor.experienceYears > 0
      ? { key: "exp", value: `${doctor.experienceYears}+`, label: "Years Experience", color: "text.primary" }
      : null,
    doctor.reviewsCount > 0
      ? { key: "rating", value: doctor.rating.toFixed(1), label: `Rating (${doctor.reviewsCount} reviews)`, color: "text.primary" }
      : null,
    minFee > 0 ? { key: "fee", value: formatCurrency(minFee), label: "Consultation from", color: "text.primary" } : null,
    doctor.verified ? { key: "verified", value: "Verified", label: "Registered Practitioner", color: "success.main" } : null,
  ].filter((s): s is { key: string; value: string; label: string; color: string } => s !== null);

  if (stats.length === 0) return null;
  const mdSize = 12 / stats.length;

  return (
    <Container maxWidth="lg" sx={{ mt: -6, position: "relative", zIndex: 5 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: (t) => `${t.tokens.radius.xxl}px`,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: "0 1px 3px rgba(16, 24, 40, 0.06)",
        }}
      >
        <Grid container spacing={2}>
          {stats.map((s) => (
            <Grid key={s.key} size={{ xs: stats.length === 1 ? 12 : 6, md: mdSize }} sx={{ textAlign: "center" }}>
              <Typography variant="h4" component="p" sx={{ fontWeight: 700, color: s.color }}>
                {s.value}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {s.label}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
}


/**
 * Long text shown clamped to `lines`, with a "Read more" toggle when it is
 * long enough to be cut. The full saved text is always in the DOM (so search
 * engines and screen readers get all of it); only the visual clamp changes.
 */
function ExpandableText({
  text,
  lines = 5,
  threshold = 420,
  sx,
}: {
  text: string;
  lines?: number;
  threshold?: number;
  sx?: SxProps<Theme>;
}) {
  const [open, setOpen] = useState(false);
  const long = text.length > threshold;
  return (
    <Box>
      <Typography
        color="text.secondary"
        sx={[
          { lineHeight: 1.7, whiteSpace: "pre-line", overflowWrap: "anywhere" },
          long && !open
            ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }
            : {},
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {text}
      </Typography>
      {long && (
        <Button
          size="small"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          sx={{ mt: 0.5, px: 0, minWidth: 0, fontWeight: 700, textTransform: "none", color: "primary.main" }}
        >
          {open ? "Show less" : "Read more"}
        </Button>
      )}
    </Box>
  );
}

/** A small uppercase label above a block inside a section. */
function BlockLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="subtitle2"
      component="h3"
      sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, mb: 1.25 }}
    >
      {children}
    </Typography>
  );
}

/** A wrap of plain chips for one list of saved entries. */
function ChipList({ items, tone = "secondary" }: { items: { id: string; name: string }[]; tone?: "primary" | "secondary" }) {
  return (
    <Stack component="ul" direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", m: 0, p: 0, listStyle: "none" }}>
      {items.map((x) => (
        <Box component="li" key={x.id} sx={{ maxWidth: "100%" }}>
          <Chip
            label={x.name}
            sx={{
              fontWeight: 700,
              maxWidth: "100%",
              height: "auto",
              py: 0.75,
              "& .MuiChip-label": { whiteSpace: "normal", overflowWrap: "anywhere" },
              color: `${tone}.dark`,
              bgcolor: "grey.50",
              border: "1px solid",
              borderColor: "grey.200",
            }}
          />
        </Box>
      ))}
    </Stack>
  );
}

/**
 * About the Doctor — directly after the hero. The short introduction leads,
 * then the biography (clamped with "Read more"), career summary, philosophy of
 * care and professional interests, with the doctor's section image alongside.
 * Qualifications, experience, location etc. are NOT repeated here — the hero
 * already shows them. Only saved values render — nothing is filled in.
 */
function AboutSection({ doctor }: { doctor: DoctorDetail }) {
  const editing = useIsEditing();
  const interests = (doctor.expertise ?? []).filter((e) => e.category === "interest");
  const has = sectionPresence(doctor).about;
  if (!has && !editing) return null;

  return (
    <RevealSection id="about" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="ABOUT THE DOCTOR"
        title={`About ${doctor.name}`}
        edit={
          <SectionEditMenu
            label="Edit this section"
            items={[
              { section: "about", label: "Edit biography, introduction & interests" },
              { section: "showcaseImage", label: "Change section image" },
            ]}
          />
        }
      />
      {!has ? (
        <EmptySectionCard message="No biography yet — use the pencil to add an introduction, biography and interests." />
      ) : (
        <Grid container spacing={{ xs: 3, md: 4 }} sx={{ alignItems: "flex-start" }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2.5}>
              {doctor.shortIntro ? (
                <Typography
                  sx={{ fontSize: { xs: "1.05rem", md: "1.15rem" }, fontWeight: 600, lineHeight: 1.6, color: "text.primary" }}
                >
                  {doctor.shortIntro}
                </Typography>
              ) : null}
              {doctor.about ? <ExpandableText text={doctor.about} /> : null}
              {doctor.careerSummary ? (
                <Box>
                  <BlockLabel>Career summary</BlockLabel>
                  <ExpandableText text={doctor.careerSummary} lines={4} threshold={320} />
                </Box>
              ) : null}
              {doctor.practicePhilosophy ? (
                <Box
                  sx={{
                    pl: 2,
                    borderLeft: "3px solid",
                    borderColor: "grey.200",
                  }}
                >
                  <BlockLabel>Philosophy of care</BlockLabel>
                  <Typography color="text.secondary" sx={{ lineHeight: 1.7, fontStyle: "italic", whiteSpace: "pre-line" }}>
                    {doctor.practicePhilosophy}
                  </Typography>
                </Box>
              ) : null}
              {interests.length > 0 && (
                <Box>
                  <BlockLabel>Professional interests</BlockLabel>
                  <ChipList items={interests} tone="primary" />
                </Box>
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2}>
              {/* Section image (doctor-chosen, stock fallback) */}
              <Paper
                elevation={0}
                sx={{
                  position: "relative",
                  aspectRatio: "4 / 3",
                  borderRadius: (t) => `${t.tokens.radius.xxl}px`,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  boxShadow: "none",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doctor.showcaseImageUrl || "/clinic_stock.png"}
                  alt={doctor.showcaseImageUrl ? `${doctor.name}'s practice` : "Consultation room"}
                  loading="lazy"
                  decoding="async"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {doctor.verified && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 12,
                      bottom: 12,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: "999px",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      bgcolor: "background.paper",
                      boxShadow: "0 1px 3px rgba(16, 24, 40, 0.1)",
                    }}
                  >
                    <Box sx={{ color: "success.main", display: "flex" }}>
                      <FiCheckCircle size={15} />
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      Profile verified by {siteConfig.shortName}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      )}
    </RevealSection>
  );
}

/** "Since 2016", "2008 – 2012", "Until 2012", or null when no years were saved. */
function affiliationRange(a: AffiliationEntry): string | null {
  if (a.isCurrent) return a.startYear ? `Since ${a.startYear}` : null;
  if (a.startYear && a.endYear) return `${a.startYear} – ${a.endYear}`;
  if (a.endYear) return `Until ${a.endYear}`;
  if (a.startYear) return `From ${a.startYear}`;
  return null;
}

/** One affiliation card: organization, role · department, location, years, website / phone. */
function AffiliationCard({ a }: { a: AffiliationEntry }) {
  const website = safeHttpUrl(a.website);
  const range = affiliationRange(a);
  return (
    <Paper elevation={0} sx={{ ...cardSx, height: "100%", display: "flex", flexDirection: "column", gap: 1 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            color: a.isCurrent ? "primary.main" : "text.secondary",
            bgcolor: "grey.100",
          }}
        >
          <FiPlusSquare size={18} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>
            {a.organization}
          </Typography>
          {(a.roleTitle || a.department) && (
            <Typography variant="body2" sx={{ fontWeight: 700, color: "secondary.main", mt: 0.25 }}>
              {[a.roleTitle, a.department].filter(Boolean).join(" · ")}
            </Typography>
          )}
        </Box>
        {a.isCurrent && <Chip size="small" label="Current" color="success" variant="outlined" sx={{ fontWeight: 700, flexShrink: 0 }} />}
      </Stack>
      {(a.location || range) && (
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap", pl: { xs: 0, sm: 6.5 } }}>
          {a.location ? (
            <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5, overflowWrap: "anywhere" }}>
              <FiMapPin size={13} style={{ flexShrink: 0 }} /> {a.location}
            </Typography>
          ) : null}
          {range ? (
            <Typography variant="body2" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <FiCalendar size={13} /> {range}
            </Typography>
          ) : null}
        </Stack>
      )}
      {(website || a.phone) && (
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: "wrap", pl: { xs: 0, sm: 6.5 }, mt: "auto" }}>
          {website ? (
            <Link
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: 700 }}
            >
              <FiExternalLink size={13} /> {displayHost(website)}
            </Link>
          ) : null}
          {a.phone ? (
            <Link href={`tel:${a.phone.replace(/\s+/g, "")}`} variant="body2" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: 700 }}>
              <FiPhone size={13} /> {a.phone}
            </Link>
          ) : null}
        </Stack>
      )}
    </Paper>
  );
}

/**
 * Current Affiliations — where the doctor practises now, from the doctor's
 * own records. Entries the doctor marked as past are listed separately
 * underneath; nothing is ever promoted to "current" automatically.
 */
function AffiliationsSection({ doctor }: { doctor: DoctorDetail }) {
  const items = doctor.affiliations ?? [];
  const editing = useIsEditing();
  if (items.length === 0 && !editing) return null;
  const current = items.filter((a) => a.isCurrent);
  const past = items.filter((a) => !a.isCurrent);
  const grid = (list: AffiliationEntry[]) => (
    <Grid container spacing={2}>
      {list.map((a) => (
        <Grid key={a.id} size={{ xs: 12, md: list.length > 1 ? 6 : 12 }}>
          <AffiliationCard a={a} />
        </Grid>
      ))}
    </Grid>
  );
  return (
    <RevealSection id="affiliations" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="PRACTICE"
        title="Current Affiliations"
        edit={<SectionEditButton section="affiliations" label="Edit affiliations" />}
      />
      {items.length === 0 ? (
        <EmptySectionCard message="No affiliations added yet — use the pencil to add the hospitals or clinics you practise at." />
      ) : (
        <Stack spacing={3}>
          {current.length > 0 && grid(current)}
          {past.length > 0 && (
            <Box>
              <BlockLabel>Previous affiliations</BlockLabel>
              {grid(past)}
            </Box>
          )}
        </Stack>
      )}
    </RevealSection>
  );
}

const EXPERTISE_GROUPS: { category: Exclude<ExpertiseCategory, "interest">; label: string }[] = [
  { category: "clinical", label: "Clinical expertise" },
  { category: "scientific", label: "Scientific expertise" },
  { category: "area", label: "Areas of expertise" },
];

/** An icon for a procedure card, guessed from its name (decoration only). */
function procedureIcon(name: string) {
  const n = name.toLowerCase();
  if (["skin", "dermatology", "laser", "acne", "cosmetic", "eye", "vision"].some((k) => n.includes(k))) return <FiEye size={20} />;
  if (["consult", "first", "general"].some((k) => n.includes(k))) return <FiUsers size={20} />;
  if (["preventive", "checkup", "screening"].some((k) => n.includes(k))) return <FiShield size={20} />;
  if (["care", "wellness", "heart", "cardio"].some((k) => n.includes(k))) return <FiHeart size={20} />;
  if (["therapy", "treatment", "pediatric", "child"].some((k) => n.includes(k))) return <FiSmile size={20} />;
  if (["diagnostic", "test", "assess", "lab"].some((k) => n.includes(k))) return <FiPlusSquare size={20} />;
  return <FiActivity size={20} />;
}

/**
 * Specialization & Expertise: specialties with their own sub-specialties
 * (from the shared specialty catalog), then the doctor's clinical /
 * scientific expertise and areas of expertise as chips. Procedures have their
 * own section further down.
 */
function ExpertiseSection({ doctor }: { doctor: DoctorDetail }) {
  const editing = useIsEditing();
  if (!sectionPresence(doctor).expertise && !editing) return null;

  const specialties = doctor.specialties?.length
    ? doctor.specialties
    : doctor.specialtyName
      ? [{ id: -1, name: doctor.specialtyName, slug: doctor.specialtySlug }]
      : [];
  const subs = doctor.subSpecializations ?? [];
  const parentIds = new Set(specialties.map((s) => s.id));
  const orphanSubs = subs.filter((s) => !parentIds.has(s.specializationId));
  const expertise = doctor.expertise ?? [];
  const groups = EXPERTISE_GROUPS.map((g) => ({ ...g, items: expertise.filter((e) => e.category === g.category) })).filter(
    (g) => g.items.length > 0,
  );
  const concerns = (doctor.symptoms ?? []).map((slug, i) => ({
    id: `concern-${i}`,
    name: slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  }));
  const nothing = !specialties.length && !subs.length && !groups.length && !concerns.length;

  return (
    <RevealSection id="expertise" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="EXPERTISE"
        title="Specialization & Expertise"
        edit={
          <SectionEditMenu
            label="Edit this section"
            items={[
              { section: "specialties", label: "Edit specialties & sub-specialties" },
              { section: "expertise", label: "Edit expertise" },
            ]}
          />
        }
      />
      {nothing ? (
        <EmptySectionCard message="No specialties or expertise yet — use the pencil to add them." />
      ) : (
        <Stack spacing={3.5}>
          {(specialties.length > 0 || orphanSubs.length > 0) && (
            <Box>
              <BlockLabel>{specialties.length > 1 ? "Specialties" : "Specialty"}</BlockLabel>
              <Grid container spacing={2}>
                {specialties.map((sp) => {
                  const children = subs.filter((s) => s.specializationId === sp.id);
                  return (
                    <Grid key={sp.id} size={{ xs: 12, md: specialties.length > 1 ? 6 : 12 }}>
                      <Paper elevation={0} sx={{ ...cardSx, height: "100%" }}>
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                          <Box sx={{ color: "secondary.main", display: "flex" }}>
                            <FiActivity size={18} />
                          </Box>
                          <Typography variant="subtitle1" component="p" sx={{ fontWeight: 700 }}>
                            {sp.name}
                          </Typography>
                        </Stack>
                        {children.length > 0 && (
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 700, mb: 0.75 }}>
                              Sub-specialties
                            </Typography>
                            <ChipList items={children.map((c) => ({ id: String(c.id), name: c.name }))} />
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  );
                })}
                {orphanSubs.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <ChipList items={orphanSubs.map((c) => ({ id: String(c.id), name: c.name }))} />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {groups.length > 0 && (
            <Grid container spacing={3}>
              {groups.map((g) => (
                <Grid key={g.category} size={{ xs: 12, md: groups.length === 1 ? 12 : groups.length === 2 ? 6 : 4 }}>
                  <BlockLabel>{g.label}</BlockLabel>
                  <ChipList items={g.items} />
                </Grid>
              ))}
            </Grid>
          )}

          {concerns.length > 0 && (
            <Box>
              <BlockLabel>Commonly consulted for</BlockLabel>
              <ChipList items={concerns} tone="primary" />
            </Box>
          )}
        </Stack>
      )}
    </RevealSection>
  );
}

/**
 * Procedures & Treatments — exactly the entries the doctor listed (the
 * existing services records); nothing is inferred from the specialty, and the
 * list is labelled as the doctor's own, not as proof of certification.
 */
function ProceduresSection({ doctor }: { doctor: DoctorDetail }) {
  const procedures = doctor.services ?? [];
  const editing = useIsEditing();
  if (procedures.length === 0 && !editing) return null;

  return (
    <RevealSection id="procedures" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="CLINICAL SERVICES"
        title="Procedures & Treatments"
        edit={<SectionEditButton section="services" label="Edit procedures & treatments" />}
      />
      {procedures.length === 0 ? (
        <EmptySectionCard message="No procedures listed yet — use the pencil to add the procedures and treatments you perform." />
      ) : (
        <>
          <Grid container spacing={2}>
            {procedures.map((p) => (
              <Grid key={p.id} size={{ xs: 12, sm: 6, md: procedures.length === 1 ? 12 : 4 }}>
                <Paper elevation={0} sx={{ ...cardSx, p: 2, height: "100%", display: "flex", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: (t) => `${t.tokens.radius.md}px`,
                      bgcolor: "grey.100",
                      color: "text.secondary",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {procedureIcon(p.name)}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>
                      {p.name}
                    </Typography>
                    {p.description ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, lineHeight: 1.55 }}>
                        {p.description}
                      </Typography>
                    ) : null}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Procedures as listed by the doctor.
          </Typography>
        </>
      )}
    </RevealSection>
  );
}

/**
 * Working Experience — a vertical timeline, one full-width card per role.
 * Current roles first, then most recent (sorted in toDisplayDoctor).
 */
function ExperienceSection({ doctor }: { doctor: DoctorDetail }) {
  const experiences = doctor.experience ?? [];
  const editing = useIsEditing();
  if (experiences.length === 0 && !editing) return null;

  return (
    <RevealSection id="experience" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="CAREER"
        title="Professional Experience"
        edit={<SectionEditButton section="experience" label="Edit professional experience" />}
      />
      {experiences.length === 0 ? (
        <EmptySectionCard message="No work experience added yet — use the pencil to add your positions." />
      ) : (
        <Box component="ol" sx={{ m: 0, p: 0 }}>
          {experiences.map((item, i) => {
            const range = experienceRange(item);
            return (
              <TimelineItem key={item.id} last={i === experiences.length - 1} accent="secondary">
                <Paper elevation={0} sx={cardSx}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 1.5, sm: 3 }}
                    sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {item.roleTitle}
                      </Typography>
                      <Typography
                        sx={{ color: "secondary.main", fontWeight: 700, mt: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}
                      >
                        <FiBriefcase size={15} style={{ flexShrink: 0 }} />
                        {item.organization}
                      </Typography>
                      {item.location ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}
                        >
                          <FiMapPin size={14} style={{ flexShrink: 0 }} />
                          {item.location}
                        </Typography>
                      ) : null}
                    </Box>
                    <Stack
                      direction={{ xs: "row", sm: "column" }}
                      spacing={1}
                      sx={{ alignItems: { xs: "center", sm: "flex-end" }, flexShrink: 0, flexWrap: "wrap" }}
                      useFlexGap
                    >
                      <Chip
                        size="small"
                        label={item.isCurrent ? "Current" : "Previous"}
                        color={item.isCurrent ? "success" : "default"}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                      {range ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, whiteSpace: "nowrap" }}
                        >
                          <FiCalendar size={14} />
                          {range}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>
                  {item.description ? (
                    <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.7, whiteSpace: "pre-line" }}>
                      {item.description}
                    </Typography>
                  ) : null}
                </Paper>
              </TimelineItem>
            );
          })}
        </Box>
      )}
    </RevealSection>
  );
}

/** "2017 – 2019", "Completed 2019", "Started 2017", or null. */
function fellowshipRange(f: FellowshipEntry): string | null {
  if (f.startYear && f.endYear && f.startYear !== f.endYear) return `${f.startYear} – ${f.endYear}`;
  if (f.endYear) return `Completed ${f.endYear}`;
  if (f.startYear) return `Started ${f.startYear}`;
  return null;
}

/**
 * Fellowships & Advanced Training — a timeline like Education, kept separate
 * from it. Most recent completion year first; undated entries last (sorted in
 * toDisplayDoctor).
 */
function FellowshipsSection({ doctor }: { doctor: DoctorDetail }) {
  const items = doctor.fellowships ?? [];
  const editing = useIsEditing();
  if (items.length === 0 && !editing) return null;

  return (
    <RevealSection id="fellowships" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="TRAINING"
        title="Fellowships & Advanced Training"
        edit={<SectionEditButton section="fellowships" label="Edit fellowships & training" />}
      />
      {items.length === 0 ? (
        <EmptySectionCard message="No fellowships or advanced training added yet — use the pencil to add them." />
      ) : (
        <Box component="ol" sx={{ m: 0, p: 0 }}>
          {items.map((f, i) => {
            const range = fellowshipRange(f);
            return (
              <TimelineItem key={f.id} last={i === items.length - 1} accent="secondary">
                <Paper elevation={0} sx={cardSx}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 1.5, sm: 3 }}
                    sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {f.title}
                      </Typography>
                      {f.specialtyArea ? (
                        <Typography color="text.primary" sx={{ fontWeight: 600, mt: 0.25 }}>
                          {f.specialtyArea}
                        </Typography>
                      ) : null}
                      <Typography
                        sx={{ color: "secondary.main", fontWeight: 700, mt: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}
                      >
                        <FiAward size={15} style={{ flexShrink: 0 }} />
                        {[f.institution, f.location].filter(Boolean).join(", ")}
                      </Typography>
                    </Box>
                    {range ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, whiteSpace: "nowrap", flexShrink: 0 }}
                      >
                        <FiCalendar size={14} />
                        {range}
                      </Typography>
                    ) : null}
                  </Stack>
                  {f.description ? (
                    <Typography color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7, whiteSpace: "pre-line" }}>
                      {f.description}
                    </Typography>
                  ) : null}
                </Paper>
              </TimelineItem>
            );
          })}
        </Box>
      )}
    </RevealSection>
  );
}

/**
 * Education & Qualifications — after Fellowships, one full-width card per
 * qualification, newest completion year first (records without a valid year
 * last; ties keep their saved order).
 */
function EducationSection({ doctor }: { doctor: DoctorDetail }) {
  const educations = doctor.education ?? [];
  const editing = useIsEditing();
  if (educations.length === 0 && !editing) return null;

  return (
    <RevealSection id="education" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="EDUCATION"
        title="Education & Qualifications"
        edit={<SectionEditButton section="education" label="Edit education" />}
      />
      {educations.length === 0 ? (
        <EmptySectionCard message="No qualifications added yet — use the pencil to add your degrees." />
      ) : (
        <Box component="ol" sx={{ m: 0, p: 0 }}>
          {educations.map((item, i) => {
            const range = educationRange(item);
            return (
              <TimelineItem
                key={`${i}-${item.degree}-${item.yearTo ?? item.year}`}
                last={i === educations.length - 1}
                accent="primary"
              >
                <Paper elevation={0} sx={cardSx}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={{ xs: 1.5, sm: 3 }}
                    sx={{ justifyContent: "space-between", alignItems: { sm: "flex-start" } }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                        {item.degree}
                      </Typography>
                      {item.fieldOfStudy ? (
                        <Typography color="text.primary" sx={{ fontWeight: 600, mt: 0.25 }}>
                          {item.fieldOfStudy}
                        </Typography>
                      ) : null}
                      <Typography
                        sx={{ color: "secondary.main", fontWeight: 700, mt: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}
                      >
                        <FiBookOpen size={15} style={{ flexShrink: 0 }} />
                        {[item.institution, item.location].filter(Boolean).join(", ")}
                      </Typography>
                    </Box>
                    {range ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, whiteSpace: "nowrap", flexShrink: 0 }}
                      >
                        <FiCalendar size={14} />
                        {range}
                      </Typography>
                    ) : null}
                  </Stack>
                </Paper>
              </TimelineItem>
            );
          })}
        </Box>
      )}
    </RevealSection>
  );
}

/**
 * Research & Publications — the doctor's saved papers only, newest year first
 * (undated last). Links open only when they are plain http(s); a DOI links to
 * doi.org. Hidden (or a placeholder in preview) when there are none.
 */
function PublicationsSection({ doctor }: { doctor: DoctorDetail }) {
  const publications = doctor.publications ?? [];
  const editing = useIsEditing();
  if (publications.length === 0 && !editing) return null;

  return (
    <RevealSection id="publications" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="RESEARCH"
        title="Research & Publications"
        edit={<SectionEditButton section="publications" label="Edit publications" />}
      />
      {publications.length === 0 ? (
        <EmptySectionCard message="No publications added yet — use the pencil to add papers or articles." />
      ) : (
        <Stack component="ol" spacing={2} sx={{ m: 0, p: 0, listStyle: "none" }}>
          {publications.map((p) => {
            const url = safeHttpUrl(p.url);
            const doiUrl = p.doi ? `https://doi.org/${encodeURI(p.doi.trim())}` : null;
            return (
              <Box component="li" key={p.id}>
                <Paper elevation={0} sx={cardSx}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Box sx={{ color: "secondary.main", mt: 0.25, display: "flex" }}>
                      <FiBookOpen size={18} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "baseline" }}>
                        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.4, overflowWrap: "anywhere" }}>
                          {p.title}
                        </Typography>
                        {p.category ? (
                          <Chip size="small" label={p.category} variant="outlined" sx={{ fontWeight: 700 }} />
                        ) : null}
                      </Stack>
                      {p.authors ? (
                        <Typography variant="body2" sx={{ mt: 0.5, color: "text.primary", overflowWrap: "anywhere" }}>
                          {p.authors}
                        </Typography>
                      ) : null}
                      {(p.publisher || p.year) && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontWeight: 600, fontStyle: "italic" }}>
                          {[p.publisher, p.year].filter(Boolean).join(" · ")}
                        </Typography>
                      )}
                      {p.abstract ? (
                        <Box sx={{ mt: 1 }}>
                          <ExpandableText text={p.abstract} lines={3} threshold={260} sx={{ fontSize: "0.92rem" }} />
                        </Box>
                      ) : null}
                      {(url || doiUrl) && (
                        <Stack direction="row" spacing={2.5} useFlexGap sx={{ flexWrap: "wrap", mt: 1.25 }}>
                          {url && (
                            <Link
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="body2"
                              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: 700, color: "primary.main" }}
                            >
                              <FiExternalLink size={14} /> Read publication
                            </Link>
                          )}
                          {doiUrl && (
                            <Link
                              href={doiUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="body2"
                              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: 700, color: "primary.main", overflowWrap: "anywhere" }}
                            >
                              <FiExternalLink size={14} /> DOI: {p.doi}
                            </Link>
                          )}
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            );
          })}
        </Stack>
      )}
    </RevealSection>
  );
}

/**
 * One award: the uploaded picture (certificate / award photo) as a 16:10 header
 * when the doctor added one, otherwise an icon. Title, issuer, year and
 * description come from the saved record only — nothing is marked verified.
 */
function AwardCard({ award: a }: { award: NonNullable<DoctorDetail["awards"]>[number] }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(a.imageUrl) && !imageFailed;
  return (
    <Paper elevation={0} sx={{ ...cardSx, p: 0, height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {showImage && (
        <Box sx={{ aspectRatio: "16 / 10", bgcolor: "action.hover", borderBottom: "1px solid", borderColor: "divider" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.imageUrl ?? undefined}
            alt={`${a.title} — award image`}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </Box>
      )}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", p: { xs: 2, md: 2.25 } }}>
        {!showImage && (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.secondary",
              bgcolor: "grey.100",
            }}
          >
            <FiAward size={17} />
          </Box>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.35, overflowWrap: "anywhere" }}>
            {a.title}
          </Typography>
          {(a.issuer || a.awardYear) && (
            <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 600, color: "secondary.main" }}>
              {[a.issuer, a.awardYear].filter(Boolean).join(" · ")}
            </Typography>
          )}
          {a.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.55 }}>
              {a.description}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

/**
 * Patient Feedback — testimonials the DOCTOR entered and chose to show. They
 * are labelled as shared by the doctor (not verified reviews); in the
 * dashboard preview an empty state invites adding some, on the public page the
 * section simply hides when there are none.
 */
function TestimonialsSection({ doctor }: { doctor: DoctorDetail }) {
  const items = doctor.testimonials ?? [];
  const editing = useIsEditing();
  if (items.length === 0 && !editing) return null;

  return (
    <RevealSection id="feedback" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="PATIENT FEEDBACK"
        title="What Patients Say"
        subtitle="Feedback shared by the doctor from their patients. These are not verified platform reviews."
        edit={<SectionEditButton section="testimonials" label="Edit patient feedback" />}
      />
      {items.length === 0 ? (
        <EmptySectionCard message="No patient feedback added yet — use the pencil to add feedback your patients have shared." />
      ) : (
        <Grid container spacing={2}>
          {items.map((t) => (
            <Grid key={t.id} size={{ xs: 12, sm: 6, md: items.length > 2 ? 4 : 6 }}>
              <Paper
                elevation={0}
                component="figure"
                sx={{ ...cardSx, m: 0, height: "100%", display: "flex", flexDirection: "column", gap: 1.5 }}
              >
                <Rating value={t.rating} readOnly size="small" aria-label={`Rated ${t.rating} out of 5`} />
                <Typography
                  component="blockquote"
                  variant="body2"
                  sx={{ m: 0, color: "text.primary", lineHeight: 1.65, flex: 1, overflowWrap: "anywhere" }}
                >
                  “{t.reviewText}”
                </Typography>
                <Stack component="figcaption" direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                  <Avatar src={t.patientPhotoUrl ?? undefined} alt="" sx={{ width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
                    {t.patientName.trim().charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                      {t.patientName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {[t.reviewDate ? formatFeedbackDate(t.reviewDate) : null, "Shared by the doctor"].filter(Boolean).join(" · ")}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </RevealSection>
  );
}

/** "12 Mar 2025" from "2025-03-12" (date-only, no timezone shift). */
function formatFeedbackDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Awards & Achievements — saved awards only, newest year first; nothing is marked verified. */
function AwardsSection({ doctor }: { doctor: DoctorDetail }) {
  const awards = doctor.awards ?? [];
  const editing = useIsEditing();
  if (awards.length === 0 && !editing) return null;

  return (
    <RevealSection id="awards" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="RECOGNITION"
        title="Awards & Achievements"
        edit={<SectionEditButton section="awards" label="Edit awards" />}
      />
      {awards.length === 0 ? (
        <EmptySectionCard message="No awards added yet — use the pencil to add them." />
      ) : (
        <Grid container spacing={2}>
          {awards.map((a) => (
            <Grid key={a.id} size={{ xs: 12, sm: 6, md: awards.length > 2 ? 4 : 6 }}>
              <AwardCard award={a} />
            </Grid>
          ))}
        </Grid>
      )}
    </RevealSection>
  );
}

/**
 * Professional Memberships — saved records only, most recent joining year
 * first. A membership number appears only when the doctor chose to make it
 * public (the API never sends a private one).
 */
function MembershipsSection({ doctor }: { doctor: DoctorDetail }) {
  const memberships = doctor.memberships ?? [];
  const editing = useIsEditing();
  if (memberships.length === 0 && !editing) return null;

  return (
    <RevealSection id="memberships" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="ASSOCIATIONS"
        title="Professional Memberships"
        edit={<SectionEditButton section="memberships" label="Edit memberships" />}
      />
      {memberships.length === 0 ? (
        <EmptySectionCard message="No memberships added yet — use the pencil to add professional associations." />
      ) : (
        <Grid container spacing={2}>
          {memberships.map((m) => {
            const years = [m.sinceYear ? `Member since ${m.sinceYear}` : null, m.validUntilYear ? `Valid until ${m.validUntilYear}` : null]
              .filter(Boolean)
              .join(" · ");
            return (
              <Grid key={m.id} size={{ xs: 12, sm: 6, md: memberships.length > 2 ? 4 : 6 }}>
                <Paper elevation={0} sx={{ ...cardSx, p: 2.25, height: "100%" }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                    <Box sx={{ color: "secondary.main", mt: 0.25, display: "flex" }}>
                      <FiUsers size={18} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700, color: "text.primary", overflowWrap: "anywhere" }}>
                        {m.organization}
                      </Typography>
                      {m.roleTitle ? (
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "secondary.main", mt: 0.25 }}>
                          {m.roleTitle}
                        </Typography>
                      ) : null}
                      {years ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          {years}
                        </Typography>
                      ) : null}
                      {m.membershipNumber ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                          Membership no. {m.membershipNumber}
                        </Typography>
                      ) : null}
                      {m.description ? (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.55 }}>
                          {m.description}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </RevealSection>
  );
}

const GALLERY_CATEGORY_LABELS: Record<string, string> = {
  clinic: "Clinic",
  facilities: "Facilities",
  equipment: "Equipment",
  events: "Events",
  activities: "Professional activities",
  other: "Other",
};

const galleryAlt = (img: GalleryImage) => img.altText || img.title || img.caption || "Clinical gallery photo";

/** "1 May 2024" from "2024-05-01" (date-only, no timezone shift). */
function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/**
 * Full-size viewer for one gallery photo: previous / next buttons and the
 * arrow keys move through the gallery, Esc or × closes, and focus returns to
 * the tile that opened it (MUI Dialog).
 */
function GalleryLightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: GalleryImage[];
  index: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const open = index !== null && images[index] !== undefined;
  const img = open ? images[index] : null;
  const many = images.length > 1;
  const step = (delta: number) => {
    if (index === null) return;
    onIndex((index + delta + images.length) % images.length);
  };
  const meta = img
    ? [img.category ? GALLERY_CATEGORY_LABELS[img.category] ?? img.category : null, img.takenOn ? formatShortDate(img.takenOn) : null].filter(Boolean).join(" · ")
    : "";
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-label={img ? galleryAlt(img) : "Photo viewer"}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      }}
      slotProps={{ paper: { sx: { bgcolor: "grey.900", color: "common.white", borderRadius: 2, overflow: "hidden" } } }}
    >
      {img && (
        <Box sx={{ position: "relative" }}>
          <IconButton
            aria-label="Close photo viewer"
            onClick={onClose}
            sx={{ position: "absolute", top: 8, right: 8, zIndex: 2, color: "common.white", bgcolor: "rgba(0,0,0,0.45)", "&:hover": { bgcolor: "rgba(0,0,0,0.65)" } }}
          >
            <FiX />
          </IconButton>
          <Box sx={{ display: "grid", placeItems: "center", bgcolor: "common.black", minHeight: { xs: 240, md: 420 } }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.imageUrl}
              alt={galleryAlt(img)}
              decoding="async"
              style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain", display: "block" }}
            />
          </Box>
          {many && (
            <>
              <IconButton
                aria-label="Previous photo"
                onClick={() => step(-1)}
                sx={{ position: "absolute", left: 8, top: "40%", color: "common.white", bgcolor: "rgba(0,0,0,0.45)", "&:hover": { bgcolor: "rgba(0,0,0,0.65)" } }}
              >
                <FiChevronLeft />
              </IconButton>
              <IconButton
                aria-label="Next photo"
                onClick={() => step(1)}
                sx={{ position: "absolute", right: 8, top: "40%", color: "common.white", bgcolor: "rgba(0,0,0,0.45)", "&:hover": { bgcolor: "rgba(0,0,0,0.65)" } }}
              >
                <FiChevronRight />
              </IconButton>
            </>
          )}
          {(img.title || img.caption || meta || many) && (
            <Box sx={{ px: { xs: 2, md: 3 }, py: 1.75 }}>
              {img.title ? (
                <Typography sx={{ fontWeight: 700 }}>{img.title}</Typography>
              ) : null}
              {img.caption ? (
                <Typography variant="body2" sx={{ color: "grey.300", mt: 0.25 }}>
                  {img.caption}
                </Typography>
              ) : null}
              <Typography variant="caption" sx={{ color: "grey.400", display: "block", mt: 0.5 }}>
                {[meta, many && index !== null ? `${index + 1} of ${images.length}` : null].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Dialog>
  );
}

/**
 * Clinical Gallery — the doctor's own photos in their arranged order, in a
 * responsive grid of equal 4:3 tiles (lazy-loaded, never stretched). A tile
 * opens the photo full-size in the viewer.
 */
function GallerySection({ doctor }: { doctor: DoctorDetail }) {
  const gallery = doctor.gallery ?? [];
  const editing = useIsEditing();
  const [viewing, setViewing] = useState<number | null>(null);
  if (gallery.length === 0 && !editing) return null;

  return (
    <RevealSection id="gallery" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="GALLERY"
        title="Clinical Gallery"
        edit={<SectionEditButton section="gallery" label="Edit gallery" />}
      />
      {gallery.length === 0 ? (
        <EmptySectionCard message="No photos yet — use the pencil to add photos of your clinic, facilities or activities." />
      ) : (
        <Box
          component="ul"
          sx={{
            m: 0,
            p: 0,
            listStyle: "none",
            display: "grid",
            gap: { xs: 1.5, md: 2 },
            gridTemplateColumns: { xs: "repeat(1, minmax(0, 1fr))", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
          }}
        >
          {gallery.map((img, i) => {
            const label = img.title || img.caption;
            return (
              <Box component="li" key={img.id} sx={{ minWidth: 0 }}>
                <ButtonBase
                  onClick={() => setViewing(i)}
                  aria-label={`Open photo: ${galleryAlt(img)}`}
                  sx={{
                    position: "relative",
                    display: "block",
                    width: "100%",
                    aspectRatio: "4 / 3",
                    borderRadius: (t) => `${t.tokens.radius.md}px`,
                    overflow: "hidden",
                    bgcolor: "action.hover",
                    textAlign: "left",
                    "& img": { transition: "transform 0.4s ease" },
                    "&:hover img": { transform: "scale(1.04)" },
                    "&:focus-visible": { outline: "3px solid", outlineColor: "secondary.main", outlineOffset: 2 },
                    "@media (prefers-reduced-motion: reduce)": { "& img": { transition: "none" }, "&:hover img": { transform: "none" } },
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt={galleryAlt(img)}
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {(label || img.category) && (
                    <Box
                      sx={{
                        position: "absolute",
                        insetInline: 0,
                        bottom: 0,
                        px: 1.5,
                        pt: 3,
                        pb: 1.25,
                        color: "common.white",
                        background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)",
                      }}
                    >
                      {img.category ? (
                        <Typography variant="caption" sx={{ display: "block", fontWeight: 700, opacity: 0.9 }}>
                          {GALLERY_CATEGORY_LABELS[img.category] ?? img.category}
                        </Typography>
                      ) : null}
                      {label ? (
                        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
                          {label}
                        </Typography>
                      ) : null}
                    </Box>
                  )}
                </ButtonBase>
              </Box>
            );
          })}
        </Box>
      )}
      <GalleryLightbox images={gallery} index={viewing} onClose={() => setViewing(null)} onIndex={setViewing} />
    </RevealSection>
  );
}

/** Insurance Section */
function InsuranceSection({ doctor }: { doctor: DoctorDetail }) {
  const insurances = doctor.insurances ?? [];
  return (
    <Box id="insurance" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        level="h3"
        overline="INSURANCE"
        title="Insurance Accepted"
        edit={<SectionEditButton section="insurance" label="Edit accepted insurance" />}
      />
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }} useFlexGap>
        {insurances.map((name) => (
          <Chip
            key={name}
            icon={<FiCheckCircle size={14} style={{ color: "inherit" }} />}
            label={name}
            variant="outlined"
            sx={{ fontWeight: 700, px: 1, py: 2, borderRadius: "8px" }}
          />
        ))}
      </Stack>
    </Box>
  );
}

/** "Mon, Wed, Fri · 10:00–13:00", or null when no schedule is saved. */
function scheduleLabel(s: { days?: string[]; openTime?: string; closeTime?: string } | null | undefined): string | null {
  if (!s?.days?.length) return null;
  const hours = s.openTime && s.closeTime ? ` · ${s.openTime}–${s.closeTime}` : "";
  return `${s.days.join(", ")}${hours}`;
}

/** One fact line inside a consultation card (icon + text). */
function ConsultFact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, lineHeight: 1.5, overflowWrap: "anywhere" }}
    >
      <Box component="span" sx={{ display: "flex", mt: 0.3, flexShrink: 0, color: "text.secondary" }}>
        {icon}
      </Box>
      <span>{children}</span>
    </Typography>
  );
}

/**
 * One consultation mode as a compact card. `available=false` renders a quiet,
 * disabled card that says the mode isn't offered (no button), so the two
 * cards stay balanced without inventing anything.
 */
function ConsultCard({
  tone,
  icon,
  title,
  subtitle,
  available,
  unavailableText,
  children,
  action,
}: {
  tone: "primary" | "secondary";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  available: boolean;
  unavailableText: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      aria-disabled={!available || undefined}
      sx={{
        ...cardSx,
        p: { xs: 2.25, md: 2.75 },
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1.75,
        opacity: available ? 1 : 0.72,
        bgcolor: available ? "background.paper" : "action.hover",
        ...(available ? {} : { "&:hover": { borderColor: "divider", boxShadow: "none" } }),
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            color: available ? `${tone}.main` : "text.disabled",
            bgcolor: "grey.100",
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {available ? subtitle : unavailableText}
          </Typography>
        </Box>
      </Stack>
      {available && children ? <Box sx={{ flex: 1 }}>{children}</Box> : <Box sx={{ flex: 1 }} />}
      {available && action}
    </Paper>
  );
}

const consultBtnSx = {
  borderRadius: "999px",
  fontWeight: 700,
  textTransform: "none",
  py: 1.1,
  "&:focus-visible": { outline: "3px solid", outlineColor: "secondary.light", outlineOffset: 2 },
} as const;

/**
 * Appointment / consultation options — directly after About. Two compact
 * cards side by side (stacked on phones): video consultation and clinic
 * consultation, each with its saved fee and schedule and the existing booking
 * action (`onBook` → the same login/profile gate and booking page as before).
 * A mode the doctor doesn't offer shows as a quiet disabled card; with
 * neither, the section is hidden.
 */
function BookingSection({
  doctor,
  canBook,
  onBook,
}: {
  doctor: DoctorDetail;
  canBook: boolean;
  onBook: (s: NonNullable<BookingState>) => void;
}) {
  if (!canBook) return null;
  const online = doctor.onlineConsult;
  const onlineSchedule = online ? scheduleLabel(doctor.onlineAvailability) : null;
  const clinics = doctor.clinics;

  return (
    <RevealSection id="book" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="APPOINTMENT"
        title="Book an Appointment"
        subtitle="Choose a video consultation or an in-person visit."
        edit={
          <SectionEditMenu
            label="Edit consultation options"
            items={[
              { section: "profile", label: "Edit video consultation fee" },
              { section: "clinics", label: "Edit clinics, fees & hours" },
            ]}
          />
        }
      />
      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <ConsultCard
            tone="primary"
            icon={<FiVideo size={20} />}
            title="Video Consultation"
            subtitle="Consult over a secure video call."
            available={online}
            unavailableText="This doctor doesn't offer video consultations."
            action={
              <Button
                variant="contained"
                color="primary"
                startIcon={<FiCalendar />}
                onClick={() => onBook({ mode: "video" })}
                fullWidth
                sx={consultBtnSx}
              >
                Book video consultation
              </Button>
            }
          >
            <Stack spacing={0.75}>
              {doctor.onlineFee > 0 ? (
                <Typography sx={{ fontWeight: 700, fontSize: "1.35rem", color: "text.primary", lineHeight: 1.2 }}>
                  {formatCurrency(doctor.onlineFee)}
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ fontWeight: 600, ml: 0.75 }}>
                    consultation fee
                  </Typography>
                </Typography>
              ) : null}
              {onlineSchedule ? <ConsultFact icon={<FiClock size={14} />}>{onlineSchedule}</ConsultFact> : null}
            </Stack>
          </ConsultCard>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <ConsultCard
            tone="secondary"
            icon={<FiMapPin size={20} />}
            title="Clinic Consultation"
            subtitle={clinics.length > 1 ? `Visit in person at one of ${clinics.length} clinics.` : "Visit the doctor in person."}
            available={clinics.length > 0}
            unavailableText="This doctor doesn't list a clinic for in-person visits."
            action={
              clinics.length === 1 ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<FiCalendar />}
                  onClick={() => onBook({ mode: "clinic", clinic: clinics[0] })}
                  fullWidth
                  sx={consultBtnSx}
                >
                  Book clinic visit
                </Button>
              ) : undefined
            }
          >
            <Stack spacing={1.25} divider={clinics.length > 1 ? <Divider flexItem /> : undefined}>
              {clinics.map((clinic) => {
                const schedule = scheduleLabel(clinic);
                // Display only: skip the city when the saved address already is/ends with it.
                const city = clinic.city && !clinic.address?.toLowerCase().trim().endsWith(clinic.city.toLowerCase().trim()) ? clinic.city : "";
                const address = [clinic.address, city].filter(Boolean).join(", ");
                return (
                  <Stack
                    key={clinic.id}
                    direction={{ xs: "column", md: clinics.length > 1 ? "row" : "column" }}
                    spacing={1}
                    sx={{ justifyContent: "space-between", alignItems: { md: clinics.length > 1 ? "center" : "stretch" } }}
                  >
                    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", flexWrap: "wrap" }} useFlexGap>
                        <Typography sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>{clinic.name}</Typography>
                        {clinic.fee > 0 ? (
                          <Typography sx={{ fontWeight: 700, color: "text.primary" }}>{formatCurrency(clinic.fee)}</Typography>
                        ) : null}
                      </Stack>
                      {address ? <ConsultFact icon={<FiMapPin size={14} />}>{address}</ConsultFact> : null}
                      {schedule ? <ConsultFact icon={<FiClock size={14} />}>{schedule}</ConsultFact> : null}
                    </Stack>
                    {clinics.length > 1 && (
                      <Button
                        variant="outlined"
                        color="secondary"
                        size="small"
                        onClick={() => onBook({ mode: "clinic", clinic })}
                        aria-label={`Book a visit at ${clinic.name}`}
                        sx={{ ...consultBtnSx, py: 0.6, px: 2, flexShrink: 0, whiteSpace: "nowrap", alignSelf: { xs: "flex-start", md: "center" } }}
                      >
                        Book visit
                      </Button>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          </ConsultCard>
        </Grid>
      </Grid>
    </RevealSection>
  );
}

/**
 * Clinic Locations and Maps explorer. Clinics saved without a map pin (address
 * typed by hand) are listed with their address and an address-search
 * directions link, but get no marker; the map shows only when at least one
 * clinic is pinned.
 */
function ClinicLocationsMap({ doctor }: { doctor: DoctorDetail }) {
  const pinned = useMemo(() => doctor.clinics.filter(hasCoordinates), [doctor.clinics]);
  const markers: MapMarker[] = pinned.map((c) => ({
    id: c.id,
    lat: c.lat,
    lng: c.lng,
    label: c.name,
    sublabel: c.address,
  }));
  const center = useMemo<[number, number]>(() => {
    if (pinned.length === 0) return [0, 0];
    const lat = pinned.reduce((s, c) => s + c.lat, 0) / pinned.length;
    const lng = pinned.reduce((s, c) => s + c.lng, 0) / pinned.length;
    return [lat, lng];
  }, [pinned]);
  const showMap = pinned.length > 0;

  return (
    <Box sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <Grid container spacing={4} sx={{ alignItems: "stretch" }}>
        {/* Left side: Clinic Cards list */}
        <Grid size={{ xs: 12, md: showMap ? 5 : 12 }}>
          <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1.5 }}>
            CLINIC LOCATIONS
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 1, mb: 3 }}>
            <Typography variant="h3" component="h2" sx={{ fontWeight: 700 }}>
              Where to Visit Me
            </Typography>
            <SectionEditButton section="clinics" label="Edit clinics & locations" />
          </Stack>

          <Stack spacing={2.5}>
            {doctor.clinics.map((clinic) => {
              const directions = directionsUrl(clinic);
              return (
                <Paper
                  key={clinic.id}
                  variant="outlined"
                  sx={{
                    zIndex: 1,
                    p: 3,
                    borderRadius: (t) => `${t.tokens.radius.xl}px`,
                    transition: "border-color 0.2s ease",
                    "&:hover": {
                      borderColor: "grey.300",
                    },
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {clinic.name}
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 2, color: "text.secondary" }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                      <Box sx={{ color: "secondary.main", mt: 0.25 }}><FiMapPin size={16} /></Box>
                      <Typography variant="body2">{clinic.address}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <Box sx={{ color: "primary.main", display: "flex" }}><FiClock size={16} /></Box>
                      <Typography variant="body2">
                        {clinic.days.join(", ")} · {clinic.openTime} – {clinic.closeTime}
                      </Typography>
                    </Stack>
                    {clinic.phone && (
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Box sx={{ color: "success.main", display: "flex" }}><FiPhone size={16} /></Box>
                        <Link href={`tel:${clinic.phone}`} variant="body2" color="inherit">
                          {clinic.phone}
                        </Link>
                      </Stack>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={2} sx={{ mt: 2.5, alignItems: "center" }}>
                    <Link
                      href={directions}
                      target="_blank"
                      rel="noopener"
                      variant="body2"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.5,
                        fontWeight: 700,
                        color: "primary.main",
                      }}
                    >
                      <FiNavigation size={14} /> Get directions
                    </Link>
                    <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Consultation Fee: {formatCurrency(clinic.fee)}
                    </Typography>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Grid>

        {/* Right side: Maps (pinned clinics only) */}
        {showMap && (
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper variant="outlined" sx={{ overflow: "hidden", height: "100%", minHeight: 360, borderRadius: (t) => `${t.tokens.radius.xl}px` }}>
              <DoctorsMap markers={markers} center={center} zoom={pinned.length > 1 ? 8 : 13} height="100%" compact />
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

/** Testimonials from patients */
function PatientTestimonials({ reviews }: { reviews: Review[] }) {
  if (!reviews || reviews.length === 0) return null;
  return (
    <Box id="reviews" component="section" sx={{ py: 2, scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <Stack sx={{ alignItems: "center", mb: 5, textAlign: "center" }}>
        <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1.5 }}>
          TESTIMONIALS
        </Typography>
        <Typography variant="h2" component="h2" sx={{ fontWeight: 700, mt: 1, fontSize: { xs: "2rem", md: "2.75rem" } }}>
          Valuable Appreciations from Patients
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        {reviews.map((r) => (
          <Grid key={r.id} size={{ xs: 12, md: 4 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 3.5,
                height: "100%",
                borderRadius: (t) => `${t.tokens.radius.xl}px`,
                bgcolor: "background.paper",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                transition: "border-color 0.2s ease",
                "&:hover": {
                  borderColor: "grey.300",
                },
              }}
            >
              <Typography
                variant="h1"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 20,
                  fontFamily: "serif",
                  fontSize: "4.5rem",
                  color: "secondary.main",
                  opacity: 0.08,
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                &rdquo;
              </Typography>
              <Box>
                <Stack direction="row" spacing={0.5} sx={{ color: "warning.main", mb: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FiStar key={i} fill={i < r.rating ? "#F4B400" : "none"} color="#F4B400" size={15} />
                  ))}
                </Stack>
                <Typography color="text.secondary" sx={{ mb: 3.5, fontStyle: "italic", fontSize: "0.95rem", lineHeight: 1.6 }}>
                  &ldquo;{r.comment}&rdquo;
                </Typography>
              </Box>

              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <DoctorAvatar name={r.patientName} size={40} sx={{ bgcolor: "secondary.main" }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {r.patientName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatRelative(r.date)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

/** Portfolio FAQs (a block inside Contact Details). */
function PortfolioFAQs({ doctor }: { doctor: DoctorDetail }) {
  const faqs = doctor.faqs ?? [];
  return (
    <Box id="faq" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        level="h3"
        overline="QUESTIONS & ANSWERS"
        title="Frequently Asked Questions"
        edit={<SectionEditButton section="faq" label="Edit FAQs" />}
      />
      <Box>
        {faqs.map((f) => (
          <Accordion
            key={f.id}
            disableGutters
            variant="outlined"
            sx={{
              mb: 1.25,
              borderRadius: (t) => `${t.tokens.radius.md}px !important`,
              borderColor: "divider",
              overflow: "hidden",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary expandIcon={<Box sx={{ fontSize: 20, lineHeight: 1 }}>⌄</Box>} sx={{ px: { xs: 2, md: 3 }, py: 0.5 }}>
              <Typography component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                {f.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: { xs: 2, md: 3 }, pb: 2.25, pt: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {f.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Contact Details — everything a patient needs to reach or visit the doctor,
 * from saved data only: public phone / email / web links, clinic addresses
 * with hours and directions (typed addresses work without a map pin),
 * accepted insurance, and FAQs. (Booking has its own section after About.)
 */
function ContactSection({ doctor }: { doctor: DoctorDetail }) {
  const links = (doctor.links ?? [])
    .map((l) => ({ ...l, href: safeHttpUrl(l.url) }))
    .filter((l): l is typeof l & { href: string } => l.href !== null);
  const hasDirect = Boolean(doctor.publicPhone || doctor.publicEmail || links.length > 0);
  const hasClinics = doctor.clinics.length > 0;
  const hasInsurance = (doctor.insurances?.length ?? 0) > 0;
  const hasFaqs = (doctor.faqs?.length ?? 0) > 0;
  const editing = useIsEditing();
  if (!hasDirect && !hasClinics && !hasInsurance && !hasFaqs && !editing) return null;

  return (
    <RevealSection id="contact" sx={{ scrollMarginTop: SECTION_SCROLL_MARGIN }}>
      <SectionHeading
        overline="CONTACT"
        title="Contact Details"
        edit={
          <SectionEditMenu
            label="Edit contact details"
            items={[
              { section: "contact", label: "Edit web & social links" },
              { section: "profile", label: "Edit public phone & email" },
              { section: "clinics", label: "Edit clinics & addresses" },
              { section: "insurance", label: "Edit accepted insurance" },
              { section: "faq", label: "Edit FAQs" },
            ]}
          />
        }
      />
      <Stack spacing={{ xs: 4, md: 5 }}>
        {hasDirect && (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2.5, md: 4 },
              borderRadius: (t) => `${t.tokens.radius.xxl}px`,
              bgcolor: (t) => (t.palette.mode === "light" ? "grey.50" : "rgba(255,255,255,0.01)"),
              borderColor: "divider",
            }}
          >
            <Grid container spacing={{ xs: 2.5, md: 4 }} sx={{ alignItems: "center" }}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1.5 }}>
                  GET IN TOUCH
                </Typography>
                <Typography variant="h5" component="h3" sx={{ fontWeight: 700, mt: 0.5, mb: 1 }}>
                  Contact the practice
                </Typography>
                <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                  Call, email or visit the doctor’s official links for questions about appointments and consultations.
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 7 }}>
                <Stack spacing={1.5}>
                  {doctor.publicPhone && (
                    <Paper variant="outlined" sx={{ p: 1.75, display: "flex", alignItems: "center", gap: 2, borderRadius: "12px" }}>
                      <Box sx={{ color: "secondary.main", display: "flex" }}>
                        <FiPhone size={20} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 700 }}>
                          PHONE
                        </Typography>
                        <Link href={`tel:${doctor.publicPhone.replace(/\s+/g, "")}`} variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {doctor.publicPhone}
                        </Link>
                      </Box>
                    </Paper>
                  )}

                  {doctor.publicEmail && (
                    <Paper variant="outlined" sx={{ p: 1.75, display: "flex", alignItems: "center", gap: 2, borderRadius: "12px" }}>
                      <Box sx={{ color: "primary.main", display: "flex" }}>
                        <FiMail size={20} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 700 }}>
                          EMAIL
                        </Typography>
                        <Link href={`mailto:${doctor.publicEmail}`} variant="subtitle2" sx={{ fontWeight: 700, overflowWrap: "anywhere" }}>
                          {doctor.publicEmail}
                        </Link>
                      </Box>
                    </Paper>
                  )}

                  {links.length > 0 && (
                    <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap", pt: 0.5 }} useFlexGap>
                      {links.map((l) => (
                        <Chip
                          key={l.id}
                          icon={<FiGlobe size={13} />}
                          label={l.linkType === "website" ? displayHost(l.href) : l.linkType}
                          component="a"
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          clickable
                          variant="outlined"
                          sx={{ textTransform: l.linkType === "website" ? "none" : "capitalize", fontWeight: 700 }}
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Clinic addresses, hours, phone and directions (+ map for pinned clinics) */}
        {hasClinics && <ClinicLocationsMap doctor={doctor} />}

        {hasInsurance && <InsuranceSection doctor={doctor} />}
        {hasFaqs && <PortfolioFAQs doctor={doctor} />}

        {editing && !hasDirect && !hasClinics && !hasInsurance && !hasFaqs && (
          <EmptySectionCard message="No contact details yet — use the pencil to add a public phone, email, links or a clinic." />
        )}
      </Stack>
    </RevealSection>
  );
}

/**
 * Compact portfolio footer: the doctor's name, designation and a one-line
 * introduction (saved data only), quick links to the sections that exist,
 * Book Appointment / Contact actions, and the platform's branding.
 */
function PortfolioFooter({
  doctor,
  canBook,
  scrollToSection,
}: {
  doctor: DoctorDetail;
  canBook: boolean;
  scrollToSection: (id: string) => void;
}) {
  const links = portfolioNavLinks(doctor);
  const designation =
    doctor.headline ||
    (doctor.specialties?.length ? doctor.specialties.map((s) => s.name).join(" · ") : doctor.specialtyName) ||
    "";
  const intro = doctor.shortIntro || "";
  const hasContact = sectionPresence(doctor).contact;
  const year = new Date().getFullYear();

  return (
    <Box
      component="footer"
      aria-label={`${doctor.name} — portfolio footer`}
      sx={{
        mt: { xs: 6, md: 8 },
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "grey.50",
      }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5 } }}>
        <Grid container spacing={{ xs: 3, md: 4 }}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <FiActivity style={{ color: "#102B5C", flexShrink: 0 }} />
              <Typography variant="h6" component="p" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                {doctor.name}
              </Typography>
            </Stack>
            {designation ? (
              <Typography variant="body2" sx={{ color: "secondary.main", fontWeight: 700, mt: 0.5 }}>
                {designation}
              </Typography>
            ) : null}
            {intro ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 1.25,
                  lineHeight: 1.6,
                  maxWidth: 420,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {intro}
              </Typography>
            ) : null}
          </Grid>

          {links.length > 0 && (
            <Grid size={{ xs: 12, sm: 7, md: 4 }}>
              <Typography variant="subtitle2" component="p" sx={{ fontWeight: 700, mb: 1 }}>
                On this page
              </Typography>
              <Box
                component="ul"
                sx={{ m: 0, p: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: 2, rowGap: 0.25 }}
              >
                {links.map((l) => (
                  <Box component="li" key={l.id}>
                    <Link
                      component="button"
                      type="button"
                      onClick={() => scrollToSection(l.id)}
                      underline="hover"
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 600,
                        py: 0.5,
                        textAlign: "left",
                        "&:hover": { color: "primary.main" },
                        "&:focus-visible": { outline: "2px solid", outlineColor: "secondary.light", outlineOffset: 2, borderRadius: 0.5 },
                      }}
                    >
                      {l.label}
                    </Link>
                  </Box>
                ))}
              </Box>
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 5, md: 3 }}>
            <Stack spacing={1.25} sx={{ alignItems: { xs: "stretch", sm: "flex-start" } }}>
              {canBook && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<FiCalendar />}
                  onClick={() => scrollToSection("book")}
                  sx={{ borderRadius: "999px", fontWeight: 700, textTransform: "none", px: 2.5 }}
                >
                  Book Appointment
                </Button>
              )}
              {hasContact && (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<FiMail />}
                  onClick={() => scrollToSection("contact")}
                  sx={{ borderRadius: "999px", fontWeight: 700, textTransform: "none", px: 2.5, bgcolor: "background.paper" }}
                >
                  Contact Details
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: { xs: 2.5, md: 3 } }} />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}
        >
          <Typography variant="caption" color="text.secondary">
            Doctor profile on{" "}
            <Link component={NextLink} href={ROUTES.home} underline="hover" sx={{ fontWeight: 700 }}>
              {siteConfig.name}
            </Link>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            © {year} {siteConfig.name}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
