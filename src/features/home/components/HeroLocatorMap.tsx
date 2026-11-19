"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FiMapPin, FiNavigation, FiVideo } from "react-icons/fi";
import { toast } from "sonner";
import { DoctorAvatar } from "@/components/ui/DoctorAvatar";
import { DoctorsMap } from "@/components/ui/DoctorsMap";
import { ROUTES } from "@/constants/routes";
import { doctors } from "@/data";
import type { Doctor, MapMarker } from "@/types/doctor";
import { formatCurrency } from "@/utils/format";
import { formatDistance, haversineKm } from "@/utils/distance";

/** Demo fallback when the browser can't/won't share a real location. */
const DEMO_LOCATION: [number, number] = [20.2961, 85.8245]; // Bhubaneswar

const allMarkers: MapMarker[] = doctors.map((d) => ({
  id: d.id,
  lat: d.lat,
  lng: d.lng,
  label: d.name,
  sublabel: `${d.specialtyName} · ${d.city}`,
  href: ROUTES.doctorProfile(d.slug),
}));

const featured = [...doctors].filter((d) => d.onlineConsult).sort((a, b) => b.rating - a.rating).slice(0, 2);

/**
 * Interactive hero map. "Use my location" asks the browser for coordinates
 * (falling back to a demo location), flies the map there and lists the nearest
 * clinics ranked by distance. Wired to dummy data now; swap `doctors` for a
 * real "clinics near me" API later.
 */
export function HeroLocatorMap() {
  const [located, setLocated] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  const nearby = useMemo(() => {
    if (!located) return [];
    const point = { lat: located[0], lng: located[1] };
    return doctors
      .map((d) => ({ doctor: d, km: haversineKm(point, { lat: d.lat, lng: d.lng }) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 4);
  }, [located]);

  const locate = () => {
    setLocating(true);
    const fallbackToDemo = () => {
      setLocated(DEMO_LOCATION);
      setLocating(false);
      toast.info("Showing a demo location (Bhubaneswar) — enable location for real results.");
    };
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocated([pos.coords.latitude, pos.coords.longitude]);
          setLocating(false);
          toast.success("Showing clinics near you");
        },
        fallbackToDemo,
        { timeout: 6000, maximumAge: 60000 },
      );
    } else {
      fallbackToDemo();
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(16, 24, 40, 0.06)",
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>
            <FiMapPin />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {located ? "Clinics near you" : "Find clinics near you"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {located ? `${nearby.length} nearby · sorted by distance` : "Explore verified doctors across India"}
            </Typography>
          </Box>
        </Stack>
        <Chip component={Link} href={ROUTES.healthcareMap} clickable size="small" label="Full map" sx={{ fontWeight: 600 }} />
      </Stack>

      <Box sx={{ position: "relative", borderTop: 1, borderColor: "divider" }}>
        <DoctorsMap
          markers={allMarkers}
          height={392}
          compact
          currentLocation={located}
          locateZoom={10}
        />
        <Button
          onClick={locate}
          loading={locating}
          variant="contained"
          startIcon={<FiNavigation />}
          sx={{
            position: "absolute",
            bottom: 16,
            right: 16,
            zIndex: 500,
            borderRadius: (t) => `${t.tokens.radius.pill}px`,
            boxShadow: 2,
          }}
        >
          Use my location
        </Button>
      </Box>

      <Box sx={{ borderTop: 1, borderColor: "divider", p: 1.5 }}>
        {located ? (
          <Stack spacing={1}>
            {nearby.map(({ doctor, km }) => (
              <NearbyRow key={doctor.id} doctor={doctor} km={km} />
            ))}
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
              Top-rated doctors · tap “Use my location” to see clinics near you
            </Typography>
            {featured.map((doctor) => (
              <NearbyRow key={doctor.id} doctor={doctor} />
            ))}
          </Stack>
        )}
      </Box>
    </Paper>
  );
}

function NearbyRow({ doctor, km }: { doctor: Doctor; km?: number }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
      <DoctorAvatar name={doctor.name} src={doctor.photoUrl} size={40} />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
          {doctor.name}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }} noWrap>
            {doctor.specialtyName}
          </Typography>
          {km != null ? (
            <Chip size="small" icon={<FiMapPin size={11} />} label={formatDistance(km)} sx={{ height: 18, fontSize: 10, "& .MuiChip-icon": { ml: 0.5 } }} />
          ) : doctor.onlineConsult ? (
            <Chip size="small" icon={<FiVideo size={11} />} label="Video" sx={{ height: 18, fontSize: 10, "& .MuiChip-icon": { ml: 0.5 } }} />
          ) : null}
        </Stack>
      </Box>
      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          from {formatCurrency(Math.min(doctor.onlineFee, doctor.consultationFee))}
        </Typography>
        <Button
          component={Link}
          href={ROUTES.doctorProfile(doctor.slug)}
          size="small"
          variant="contained"
          sx={{ mt: 0.25, borderRadius: (t) => `${t.tokens.radius.pill}px`, px: 1.5, py: 0.25, minHeight: 0 }}
        >
          Consult
        </Button>
      </Box>
    </Stack>
  );
}
