"use client";

import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FiActivity, FiMapPin, FiSearch, FiThermometer, FiUser } from "react-icons/fi";
import { ROUTES } from "@/constants/routes";
import { SEARCH_PARAMS } from "@/constants/search-params";
import { searchAll } from "@/services/search.service";
import type { SearchResult } from "@/types/doctor";

const typeIcon: Record<SearchResult["type"], React.ReactNode> = {
  specialty: <FiActivity />,
  symptom: <FiThermometer />,
  doctor: <FiUser />,
  location: <FiMapPin />,
};

export interface SearchBarProps {
  placeholder?: string;
  /** Larger hero variant. */
  size?: "medium" | "large";
  sx?: SxProps<Theme>;
}

/**
 * Universal search. Suggests specialties, symptoms, doctors and locations as
 * you type and routes to the matching page; free-text submit goes to the Find
 * Doctor listing filtered by query. The leading icon is merged into
 * Autocomplete's own `slotProps.input.startAdornment` so MUI reserves the
 * correct input padding for it (no manual pixel offsets to get wrong).
 */
export function SearchBar({ placeholder = "Search symptoms, specialties, doctors…", size = "medium", sx }: SearchBarProps) {
  const router = useRouter();
  const [input, setInput] = useState("");

  const options = useMemo(() => searchAll(input), [input]);
  const large = size === "large";

  const submitFreeText = () => {
    const q = input.trim();
    router.push(q ? `${ROUTES.findDoctor}?${SEARCH_PARAMS.query}=${encodeURIComponent(q)}` : ROUTES.findDoctor);
  };

  return (
    <Autocomplete<SearchResult, false, false, true>
      freeSolo
      fullWidth
      options={options}
      filterOptions={(x) => x}
      inputValue={input}
      onInputChange={(_, value) => setInput(value)}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.label)}
      onChange={(_, value) => {
        if (value && typeof value !== "string") router.push(value.href);
      }}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.href} sx={{ gap: 1.5 }}>
          <Box sx={{ color: "text.secondary", display: "inline-flex" }}>{typeIcon[option.type]}</Box>
          <Box>
            <Typography variant="body2">{option.label}</Typography>
            {option.sublabel && (
              <Typography variant="caption" color="text.secondary">
                {option.sublabel}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      sx={sx}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitFreeText();
          }}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              startAdornment: (
                <InputAdornment position="start" sx={{ color: "text.secondary", pl: large ? 0.75 : 0.5 }}>
                  <FiSearch size={large ? 22 : 18} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: (t) => `${t.tokens.radius.pill}px`,
              bgcolor: "background.paper",
              py: large ? 0.75 : 0,
              fontSize: large ? "1.05rem" : undefined,
              boxShadow: large ? 1 : 0,
            },
          }}
        />
      )}
    />
  );
}
