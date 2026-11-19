"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { FiChevronDown, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { toast } from "sonner";
import { PageContainer } from "@/components/common";
import { FormContainer, RHFTextField } from "@/components/forms";
import { contactSchema, type ContactFormValues } from "../schemas";

const faqs = [
  ["Is IHS a booking platform?", "The MVP focuses on trusted discovery. Booking and payments are intentionally out of scope."],
  ["Are doctors verified?", "The interface distinguishes verified profiles and is designed for stronger verification workflows later."],
  ["Can clinics partner with IHS?", "Yes. The platform architecture is ready for clinic and hospital onboarding modules."],
];

export function ContactPageContent() {
  const methods = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
  });

  const handleSubmit = (values: ContactFormValues) => {
    toast.success(`Thanks ${values.name}. We received your message.`);
    methods.reset();
  };

  return (
    <PageContainer
      title="Contact us"
      subtitle="Questions, partnerships or feedback about India Health System."
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
            <FormContainer methods={methods} onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <Alert severity="info">
                  This MVP stores no messages yet. The form validates and is
                  API-ready.
                </Alert>
                <RHFTextField<ContactFormValues>
                  name="name"
                  label="Full name"
                  fullWidth
                />
                <RHFTextField<ContactFormValues>
                  name="email"
                  label="Email"
                  type="email"
                  fullWidth
                />
                <RHFTextField<ContactFormValues>
                  name="phone"
                  label="Phone"
                  fullWidth
                />
                <RHFTextField<ContactFormValues>
                  name="message"
                  label="Message"
                  fullWidth
                  multiline
                  minRows={5}
                />
                <Button type="submit" variant="contained" size="large">
                  Send message
                </Button>
              </Stack>
            </FormContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <ContactLine
                  icon={<FiMapPin />}
                  title="Office"
                  body="Prime medisys Pvt.Ltd ,Bhubaneswar, India"
                />
                <ContactLine
                  icon={<FiMail />}
                  title="Email"
                  body="primemedisys@gmail.com"
                />
                <ContactLine
                  icon={<FiPhone />}
                  title="Phone"
                  body="+91 7873366631"
                />
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1 }}>
              {faqs.map(([question, answer]) => (
                <Accordion key={question} disableGutters elevation={0}>
                  <AccordionSummary expandIcon={<FiChevronDown />}>
                    <Typography sx={{ fontWeight: 700 }}>{question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography color="text.secondary">{answer}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </PageContainer>
  );
}

function ContactLine({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Stack direction="row" spacing={1.5}>
      <Stack sx={{ color: "primary.main", pt: 0.25 }}>{icon}</Stack>
      <Stack>
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography color="text.secondary">{body}</Typography>
      </Stack>
    </Stack>
  );
}
