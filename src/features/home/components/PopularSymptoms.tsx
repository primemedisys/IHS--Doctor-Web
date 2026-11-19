import Stack from "@mui/material/Stack";
import { TagChip } from "@/components/ui/TagChip";
import { SectionTitle } from "@/components/typography/SectionTitle";
import { ROUTES } from "@/constants/routes";
import { SEARCH_PARAMS } from "@/constants/search-params";
import { symptoms } from "@/data";
import { Section } from "./Section";

/** Symptom chips that route to a symptom-filtered doctor search. */
export function PopularSymptoms() {
  return (
    <Section tinted>
      <SectionTitle
        eyebrow="Not sure who to see?"
        title="Search by symptom"
        subtitle="Tell us what you're feeling and we'll point you to the right specialist."
      />
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap" }}>
        {symptoms.map((s) => (
          <TagChip
            key={s.slug}
            label={s.name}
            color="default"
            href={`${ROUTES.findDoctor}?${SEARCH_PARAMS.symptom}=${s.slug}`}
          />
        ))}
      </Stack>
    </Section>
  );
}
