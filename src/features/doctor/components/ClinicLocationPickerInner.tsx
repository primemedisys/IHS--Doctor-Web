"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
import { APIProvider, Map, Marker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useRef, useState } from "react";
import { env } from "@/config/env";

/** The location a doctor picks — lat/lng plus any address parts we could resolve. */
export interface PickedLocation {
  lat: number;
  lng: number;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface ClinicLocationPickerProps {
  value?: { lat: number; lng: number } | null;
  onChange: (loc: PickedLocation) => void;
  height?: number;
}

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India
const MAPS_LIBRARIES = ["places"];

/** Pull our clinic fields out of a Google address-component list. */
function parseAddress(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  fallbackLine: string,
  lat: number,
  lng: number,
): PickedLocation {
  const get = (type: string) => components?.find((c) => c.types.includes(type))?.long_name;
  const addressLine =
    [get("street_number"), get("route") ?? get("sublocality") ?? get("neighborhood")].filter(Boolean).join(" ") ||
    fallbackLine.split(",").slice(0, 2).join(",").trim();
  return {
    lat,
    lng,
    addressLine: addressLine || fallbackLine,
    city: get("locality") ?? get("administrative_area_level_2") ?? get("administrative_area_level_3"),
    state: get("administrative_area_level_1"),
    pincode: get("postal_code"),
  };
}

/** Recenters the map when the picked position changes (search / prop / click). */
function Recenter({ position }: { position: google.maps.LatLngLiteral | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && position) {
      map.panTo(position);
      map.setZoom(Math.max(map.getZoom() ?? 15, 15));
    }
  }, [map, position]);
  return null;
}

/**
 * Search-and-pin clinic location picker on Google Maps. Address search is powered
 * by the Google Places Autocomplete + Details APIs (real Google results as you
 * type); the doctor can also click the map or drag the pin. lat/lng — and, when
 * resolved, address/city/state/pincode — flow back via `onChange`.
 */
function Picker({ value, onChange, height = 300 }: ClinicLocationPickerProps) {
  const { mode, systemMode } = useColorScheme();
  const resolved = mode === "system" ? systemMode : mode;

  const placesLib = useMapsLibrary("places");
  const geocodingLib = useMapsLibrary("geocoding");

  const autocompleteService = useMemo(
    () => (placesLib ? new placesLib.AutocompleteService() : null),
    [placesLib],
  );
  const placesService = useMemo(
    () => (placesLib ? new placesLib.PlacesService(document.createElement("div")) : null),
    [placesLib],
  );
  const geocoder = useMemo(() => (geocodingLib ? new geocodingLib.Geocoder() : null), [geocodingLib]);

  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(
    value && value.lat && value.lng ? { lat: value.lat, lng: value.lng } : null,
  );
  const [options, setOptions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced Google Places predictions as the doctor types.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!autocompleteService) return;
    debounce.current = setTimeout(() => {
      const q = input.trim();
      if (q.length < 3) {
        setOptions([]);
        return;
      }
      setLoading(true);
      autocompleteService.getPlacePredictions(
        { input: q, componentRestrictions: { country: "in" } },
        (predictions) => {
          setOptions(predictions ?? []);
          setLoading(false);
        },
      );
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [input, autocompleteService]);

  const reverse = (lat: number, lng: number): Promise<PickedLocation> =>
    new Promise((resolve) => {
      if (!geocoder) {
        resolve({ lat, lng });
        return;
      }
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          resolve(parseAddress(results[0].address_components, results[0].formatted_address, lat, lng));
        } else {
          resolve({ lat, lng });
        }
      });
    });

  const place = async (lat: number, lng: number, known?: PickedLocation) => {
    setPosition({ lat, lng });
    const picked = known ?? (await reverse(lat, lng));
    onChange({ ...picked, lat, lng });
  };

  // Resolve a chosen prediction to coordinates + address via Place Details.
  const selectPrediction = (pred: google.maps.places.AutocompletePrediction | null) => {
    if (!placesService || !pred) return;
    placesService.getDetails(
      { placeId: pred.place_id, fields: ["geometry", "address_components", "formatted_address", "name"] },
      (pl, status) => {
        if (status === "OK" && pl?.geometry?.location) {
          const lat = pl.geometry.location.lat();
          const lng = pl.geometry.location.lng();
          void place(lat, lng, parseAddress(pl.address_components, pl.formatted_address ?? pl.name ?? "", lat, lng));
        }
      },
    );
  };

  return (
    <Stack spacing={1.5}>
      <Autocomplete<google.maps.places.AutocompletePrediction>
        filterOptions={(x) => x}
        options={options}
        loading={loading}
        inputValue={input}
        onInputChange={(_e, v) => setInput(v)}
        getOptionLabel={(o) => o.description}
        isOptionEqualToValue={(a, b) => a.place_id === b.place_id}
        noOptionsText={input.length < 3 ? "Type an address to search" : "No matches"}
        loadingText="Searching Google…"
        onChange={(_e, option) => selectPrediction(option)}
        renderInput={(params) => (
          <TextField {...params} label="Search your clinic address" placeholder="e.g. Apollo Hospital, Bhubaneswar" />
        )}
      />

      <Box sx={{ height, width: "100%", borderRadius: (t) => `${t.tokens.radius.md}px`, overflow: "hidden" }}>
        <Map
          defaultCenter={position ?? DEFAULT_CENTER}
          defaultZoom={position ? 15 : 5}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          clickableIcons={false}
          colorScheme={resolved === "dark" ? "DARK" : "LIGHT"}
          onClick={(e) => {
            const ll = e.detail.latLng;
            if (ll) void place(ll.lat, ll.lng);
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <Recenter position={position} />
          {position && (
            <Marker
              position={position}
              draggable
              onDragEnd={(e) => {
                const ll = e.latLng;
                if (ll) void place(ll.lat(), ll.lng());
              }}
            />
          )}
        </Map>
      </Box>

      <Typography variant="caption" color="text.secondary">
        {position
          ? `Pin set at ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)} — search, click the map, or drag the pin to adjust.`
          : "Search for your clinic or click on the map to drop a pin."}
      </Typography>
    </Stack>
  );
}

export default function ClinicLocationPickerInner(props: ClinicLocationPickerProps) {
  if (!env.isMapsEnabled) {
    return (
      <Box
        sx={{
          p: 2,
          borderRadius: (t) => `${t.tokens.radius.md}px`,
          bgcolor: "action.hover",
          color: "text.secondary",
          textAlign: "center",
        }}
      >
        <Typography variant="body2">
          Google Maps search isn&apos;t available right now. Type your clinic address below — it saves
          without a map pin, and you can add coordinates later.
        </Typography>
      </Box>
    );
  }
  return (
    <APIProvider apiKey={env.googleMapsApiKey} libraries={MAPS_LIBRARIES}>
      <Picker {...props} />
    </APIProvider>
  );
}
