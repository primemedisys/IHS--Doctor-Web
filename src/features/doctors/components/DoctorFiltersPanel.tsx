"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { LocationSelect } from "@/components/ui";
import { SEARCH_PARAMS } from "@/constants/search-params";
import { languages, specialties } from "@/data";
import type { DoctorFilters, DoctorSort, Gender } from "@/types/doctor";

const sortOptions: Array<{ value: DoctorSort; label: string }> = [
  { value: "relevance", label: "Most relevant" },
  { value: "rating", label: "Highest rated" },
  { value: "experience", label: "Most experienced" },
  { value: "fee", label: "Lowest fee" },
  { value: "nearest", label: "Nearest" },
];

interface DoctorFiltersPanelProps {
  filters: DoctorFilters;
  onChange: (patch: Record<string, string | number | boolean | undefined>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export function DoctorFiltersPanel({ filters, onChange, onReset, hasActiveFilters }: DoctorFiltersPanelProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, position: { lg: "sticky" }, top: { lg: 96 } }}>
      <Stack spacing={2.25}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6">Filters</Typography>
          <Button size="small" onClick={onReset} disabled={!hasActiveFilters}>
            Reset
          </Button>
        </Stack>

        <TextField
          label="Search"
          value={filters.search ?? ""}
          onChange={(event) => onChange({ [SEARCH_PARAMS.query]: event.target.value })}
          placeholder="Name, hospital, city"
          fullWidth
        />

        <FormControl fullWidth>
          <InputLabel>Specialty</InputLabel>
          <Select
            label="Specialty"
            value={filters.specialtySlug ?? ""}
            onChange={(event) => onChange({ [SEARCH_PARAMS.specialty]: event.target.value || undefined })}
          >
            <MenuItem value="">All specialties</MenuItem>
            {specialties.map((specialty) => (
              <MenuItem key={specialty.slug} value={specialty.slug}>
                {specialty.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Location
          </Typography>
          <LocationSelect
            direction="column"
            value={{ stateCode: filters.stateCode, city: filters.city }}
            onChange={(next) =>
              onChange({ [SEARCH_PARAMS.state]: next.stateCode, [SEARCH_PARAMS.city]: next.city })
            }
          />
        </Box>

        <FormControl fullWidth>
          <InputLabel>Language</InputLabel>
          <Select
            label="Language"
            value={filters.language ?? ""}
            onChange={(event) => onChange({ [SEARCH_PARAMS.language]: event.target.value || undefined })}
          >
            <MenuItem value="">Any language</MenuItem>
            {languages.map((language) => (
              <MenuItem key={language} value={language}>
                {language}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Gender</InputLabel>
          <Select
            label="Gender"
            value={filters.gender ?? ""}
            onChange={(event) => onChange({ [SEARCH_PARAMS.gender]: (event.target.value as Gender) || undefined })}
          >
            <MenuItem value="">Any gender</MenuItem>
            <MenuItem value="female">Female</MenuItem>
            <MenuItem value="male">Male</MenuItem>
          </Select>
        </FormControl>

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Minimum experience: {filters.minExperience ?? 0}+ years
          </Typography>
          <Slider
            value={filters.minExperience ?? 0}
            min={0}
            max={25}
            step={1}
            valueLabelDisplay="auto"
            onChange={(_, value) => onChange({ [SEARCH_PARAMS.minExperience]: value as number })}
          />
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Max fee: {filters.maxFee ? `₹${filters.maxFee}` : "Any"}
          </Typography>
          <Slider
            value={filters.maxFee ?? 2000}
            min={500}
            max={2000}
            step={100}
            valueLabelDisplay="auto"
            onChange={(_, value) => onChange({ [SEARCH_PARAMS.maxFee]: value as number })}
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={Boolean(filters.verified)}
              onChange={(event) => onChange({ [SEARCH_PARAMS.verified]: event.target.checked || undefined })}
            />
          }
          label="Verified only"
        />
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(filters.available)}
              onChange={(event) => onChange({ [SEARCH_PARAMS.available]: event.target.checked || undefined })}
            />
          }
          label="Available now"
        />
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(filters.videoConsult)}
              onChange={(event) => onChange({ [SEARCH_PARAMS.videoConsult]: event.target.checked || undefined })}
            />
          }
          label="Video consult available"
        />

        <FormControl fullWidth>
          <InputLabel>Sort</InputLabel>
          <Select
            label="Sort"
            value={filters.sort ?? "relevance"}
            onChange={(event) => onChange({ [SEARCH_PARAMS.sort]: event.target.value })}
          >
            {sortOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Paper>
  );
}
