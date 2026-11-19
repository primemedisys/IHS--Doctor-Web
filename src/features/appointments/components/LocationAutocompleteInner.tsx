"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiMapPin } from "react-icons/fi";
import { env } from "@/config/env";

export interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
  placeholder?: string;
}

const MAPS_LIBRARIES = ["places"];
/** patient_vitals.location is VARCHAR(150) — cap client-side so the API never 422s on length. */
const MAX_LEN = 150;
const PLACEHOLDER = "e.g. Apollo Hospital, Bhubaneswar";

/**
 * A required "where was this reading taken" field backed by Google Maps: type to
 * get live Google **Places** predictions (India), or tap "Use current location"
 * to reverse-geocode the browser's coordinates to an address. The chosen place
 * description is what gets stored (a plain string).
 */
function Search({ value, onChange, required, error, helperText, label = "Location", placeholder = PLACEHOLDER }: LocationAutocompleteProps) {
  const placesLib = useMapsLibrary("places");
  const geocodingLib = useMapsLibrary("geocoding");
  const autocompleteService = useMemo(() => (placesLib ? new placesLib.AutocompleteService() : null), [placesLib]);
  const geocoder = useMemo(() => (geocodingLib ? new geocodingLib.Geocoder() : null), [geocodingLib]);

  const [options, setOptions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced Google Places predictions as the doctor types (India-restricted).
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!autocompleteService) return;
    debounce.current = setTimeout(() => {
      const q = value.trim();
      if (q.length < 3) {
        setOptions([]);
        return;
      }
      setLoading(true);
      autocompleteService.getPlacePredictions({ input: q, componentRestrictions: { country: "in" } }, (predictions) => {
        setOptions(predictions ?? []);
        setLoading(false);
      });
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [value, autocompleteService]);

  const useCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation || !geocoder) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geocoder.geocode({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            onChange(results[0].formatted_address.slice(0, MAX_LEN));
          }
          setLocating(false);
        });
      },
      () => setLocating(false),
      { timeout: 8000, maximumAge: 60000 },
    );
  };

  return (
    <Stack spacing={0.75}>
      <Autocomplete<google.maps.places.AutocompletePrediction, false, false, true>
        freeSolo
        fullWidth
        filterOptions={(x) => x}
        options={options}
        loading={loading}
        inputValue={value}
        onInputChange={(_e, v) => onChange(v.slice(0, MAX_LEN))}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.description)}
        noOptionsText={value.trim().length < 3 ? "Type a place to search" : "No matches"}
        loadingText="Searching Google…"
        onChange={(_e, option) => {
          if (option && typeof option !== "string") onChange(option.description.slice(0, MAX_LEN));
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            required={required}
            error={error}
            helperText={helperText}
          />
        )}
      />
      <Button
        size="small"
        onClick={useCurrentLocation}
        disabled={locating || !geocoder}
        startIcon={<FiMapPin size={14} />}
        sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 600 }}
      >
        {locating ? "Locating…" : "Use current location"}
      </Button>
    </Stack>
  );
}

/** No Maps key configured → a plain required text field (graceful fallback, like the maps elsewhere). */
export default function LocationAutocompleteInner(props: LocationAutocompleteProps) {
  if (!env.isMapsEnabled) {
    return (
      <TextField
        label={props.label ?? "Location"}
        placeholder={props.placeholder ?? PLACEHOLDER}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.slice(0, MAX_LEN))}
        required={props.required}
        error={props.error}
        helperText={props.helperText}
        fullWidth
      />
    );
  }
  return (
    <APIProvider apiKey={env.googleMapsApiKey} libraries={MAPS_LIBRARIES}>
      <Search {...props} />
    </APIProvider>
  );
}
