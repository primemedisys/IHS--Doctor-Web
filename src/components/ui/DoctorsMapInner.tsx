"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useColorScheme, useTheme } from "@mui/material/styles";
import { APIProvider, InfoWindow, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import Link from "next/link";
import { useEffect, useState } from "react";
import { env } from "@/config/env";
import { INDIA_CENTER, INDIA_ZOOM } from "@/data/geo";
import type { MapMarker } from "@/types/doctor";

export interface DoctorsMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: number | string;
  /**
   * Showpiece mode: keeps dragging and zoom buttons, but requires a modifier to
   * zoom with the wheel (Google "cooperative" gestures) so the embedded map
   * never hijacks page scrolling.
   */
  compact?: boolean;
  /** Optional "you are here" marker; the map pans to it when it changes. */
  currentLocation?: [number, number] | null;
  /** Zoom used when flying to `currentLocation`. */
  locateZoom?: number;
}

/** The shared Maps JS libraries — kept as one stable array so the loader script
 * is requested with identical params across every map on the page. */
const MAPS_LIBRARIES = ["places"];

const toLatLng = (c: [number, number]) => ({ lat: c[0], lng: c[1] });

/** Pans/zooms the map to a target when it changes (e.g. "use my location"). */
function PanTo({ target, zoom }: { target?: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (map && target) {
      map.panTo(toLatLng(target));
      map.setZoom(zoom ?? Math.max(map.getZoom() ?? 9, 13));
    }
  }, [map, target, zoom]);
  return null;
}

/** Renders the pins + popups once the Maps JS API is ready (map instance present). */
function MapContent({
  markers,
  currentLocation,
}: {
  markers: MapMarker[];
  currentLocation?: [number, number] | null;
}) {
  const map = useMap();
  const theme = useTheme();
  const [selected, setSelected] = useState<string | null>(null);

  // `google` is guaranteed loaded once the map instance exists.
  if (!map) return null;

  const paper = theme.palette.background.paper;
  const pin: google.maps.Symbol = {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z",
    fillColor: theme.palette.primary.main,
    fillOpacity: 1,
    strokeColor: paper,
    strokeWeight: 1,
    scale: 1.7,
    anchor: new google.maps.Point(12, 22),
  };
  const meDot: google.maps.Symbol = {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 7,
    fillColor: theme.palette.secondary.main,
    fillOpacity: 1,
    strokeColor: paper,
    strokeWeight: 3,
  };

  const active = markers.find((m) => m.id === selected) ?? null;

  return (
    <>
      {currentLocation && <Marker position={toLatLng(currentLocation)} icon={meDot} title="You are here" />}

      {markers.map((m) => (
        <Marker key={m.id} position={{ lat: m.lat, lng: m.lng }} icon={pin} onClick={() => setSelected(m.id)} />
      ))}

      {active && (
        <InfoWindow position={{ lat: active.lat, lng: active.lng }} onCloseClick={() => setSelected(null)}>
          <Box sx={{ p: 0.5, maxWidth: 240 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
              {active.label}
            </Typography>
            {active.sublabel && (
              <Typography variant="caption" color="text.secondary">
                {active.sublabel}
              </Typography>
            )}
            {active.href && (
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                <Link href={active.href} style={{ color: theme.palette.primary.main, fontWeight: 600 }}>
                  View profile →
                </Link>
              </Typography>
            )}
          </Box>
        </InfoWindow>
      )}
    </>
  );
}

/** Shown when no Maps API key is configured. */
function MapUnavailable({ height }: { height?: number | string }) {
  return (
    <Box
      sx={{
        height,
        width: "100%",
        minHeight: 200,
        display: "grid",
        placeItems: "center",
        bgcolor: "action.hover",
        borderRadius: (t) => `${t.tokens.radius.md}px`,
        color: "text.secondary",
        p: 2,
        textAlign: "center",
      }}
    >
      <Typography variant="body2">Map unavailable — set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable it.</Typography>
    </Box>
  );
}

/**
 * Interactive doctor map (Google Maps via @vis.gl/react-google-maps). Theme-aware
 * (light/dark), custom teardrop pins and info windows that link to the doctor
 * profile. Rendered client-only via a dynamic import in DoctorsMap.
 */
export default function DoctorsMapInner({
  markers,
  center = INDIA_CENTER,
  zoom = INDIA_ZOOM,
  height = 360,
  compact = false,
  currentLocation = null,
  locateZoom,
}: DoctorsMapProps) {
  const { mode, systemMode } = useColorScheme();
  const resolved = mode === "system" ? systemMode : mode;

  if (!env.isMapsEnabled) return <MapUnavailable height={height} />;

  return (
    <Box sx={{ height, width: "100%", "& .gm-style": { fontFamily: "inherit" } }}>
      <APIProvider apiKey={env.googleMapsApiKey} libraries={MAPS_LIBRARIES}>
        <Map
          defaultCenter={toLatLng(center)}
          defaultZoom={zoom}
          gestureHandling={compact ? "cooperative" : "greedy"}
          disableDefaultUI={false}
          zoomControl
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          clickableIcons={false}
          colorScheme={resolved === "dark" ? "DARK" : "LIGHT"}
          style={{ width: "100%", height: "100%" }}
        >
          <PanTo target={currentLocation} zoom={locateZoom} />
          <MapContent markers={markers} currentLocation={currentLocation} />
        </Map>
      </APIProvider>
    </Box>
  );
}
