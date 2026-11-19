import { z } from "zod";
import { emailSchema, phoneSchema } from "@/schemas";

export const contactSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  message: z.string().min(20, "Tell us a little more so we can help"),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
