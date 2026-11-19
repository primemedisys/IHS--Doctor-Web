"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { MotionConfig, motion, type Variants } from "framer-motion";
import { FiCheckCircle, FiMapPin, FiVideo } from "react-icons/fi";
import { DoctorAvatar } from "@/components/ui/DoctorAvatar";
import { RatingStat } from "@/components/ui/RatingStat";
import { SearchBar } from "@/components/ui/SearchBar";
import { TagChip } from "@/components/ui/TagChip";
import { ROUTES } from "@/constants/routes";
import { SEARCH_PARAMS } from "@/constants/search-params";
import { doctors, specialties, states } from "@/data";
import { formatCompactNumber } from "@/utils/format";
import { HeroLocatorMap } from "./HeroLocatorMap";

const totalDoctors = states.reduce((sum, s) => sum + s.doctorsCount, 0);
const avgRating = doctors.reduce((sum, d) => sum + d.rating, 0) / doctors.length;
const trustAvatars = doctors.slice(0, 5);
const quickSpecialties = specialties.slice(0, 2);

const easeOut = [0.22, 1, 0.36, 1] as const;
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

/** Hero: universal search + quick filters (left), and an interactive "clinics near you" map (right). */
export function HeroSection() {
  return (
    <MotionConfig reducedMotion="user">
      <Box
        component="section"
        sx={{
          position: "relative",
          overflow: "hidden",
          bgcolor: "background.default",
          pt: { xs: 5, md: 7 },
          pb: { xs: 8, md: 11 },
        }}
      >
        <HeroBackdrop />
        <Container maxWidth="xl" sx={{ position: "relative", zIndex: 1 }}>
          <Grid container spacing={{ xs: 5, lg: 6 }} sx={{ alignItems: "center" }}>
            {/* Left — copy + search */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <motion.div variants={stagger} initial="hidden" animate="show">
                <Stack spacing={3}>
                  <motion.div variants={fadeUp}>
                    <Chip
                      icon={<FiCheckCircle />}
                      label="Verified doctors · Video & in-clinic"
                      sx={{
                        width: "fit-content",
                        fontWeight: 700,
                        color: "text.primary",
                        bgcolor: "grey.100",
                        "& .MuiChip-icon": { color: "inherit" },
                      }}
                    />
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Typography
                      variant="h1"
                      sx={{ maxWidth: 640, fontSize: { xs: "2.5rem", sm: "3rem", md: "3.6rem" }, lineHeight: { xs: 1.15, md: 1.08 } }}
                    >
                      Consult top doctors,{" "}
                      <Box component="span" sx={{ color: "text.secondary" }}>
                        online or near you.
                      </Box>
                    </Typography>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 560, fontWeight: 400 }}>
                      Find the right specialist by symptom, specialty or location — then book a video consult or a
                      visit to their clinic.
                    </Typography>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Box sx={{ width: "100%", maxWidth: 620 }}>
                      <SearchBar size="large" />
                    </Box>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                      <TagChip
                        label="Available now"
                        href={`${ROUTES.findDoctor}?${SEARCH_PARAMS.available}=true`}
                        icon={<FiCheckCircle />}
                        color="secondary"
                      />
                      <TagChip
                        label="Video consult"
                        href={`${ROUTES.findDoctor}?${SEARCH_PARAMS.videoConsult}=true`}
                        icon={<FiVideo />}
                      />
                      <TagChip label="Near me" href={ROUTES.healthcareMap} icon={<FiMapPin />} />
                      {quickSpecialties.map((s) => (
                        <TagChip key={s.slug} label={s.name} href={`${ROUTES.findDoctor}?${SEARCH_PARAMS.specialty}=${s.slug}`} />
                      ))}
                    </Stack>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", pt: 0.5 }}>
                      <Stack direction="row" sx={{ "& > *": { ml: "-10px" }, "& > *:first-of-type": { ml: 0 } }}>
                        {trustAvatars.map((d) => (
                          <DoctorAvatar key={d.id} name={d.name} size={36} sx={{ border: "2px solid", borderColor: "background.default", fontSize: 13 }} />
                        ))}
                      </Stack>
                      <Box>
                        <RatingStat value={avgRating} size="small" />
                        <Typography variant="caption" color="text.secondary">
                          {formatCompactNumber(totalDoctors)}+ verified doctors across India
                        </Typography>
                      </Box>
                    </Stack>
                  </motion.div>
                </Stack>
              </motion.div>
            </Grid>

            {/* Right — interactive locate-me map */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: easeOut, delay: 0.15 }}
              >
                <HeroLocatorMap />
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </MotionConfig>
  );
}

function HeroBackdrop() {
  return (
    <Box aria-hidden sx={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: (t) =>
            `radial-gradient(${alpha(t.palette.text.primary, t.palette.mode === "light" ? 0.06 : 0.14)} 1px, transparent 1px)`,
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 65%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent 65%)",
        }}
      />
    </Box>
  );
}
