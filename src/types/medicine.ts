/** Types for the doctor's personal medicine master list. */

export const MEDICINE_FORMS = ["oral", "topical", "injection", "drops", "inhaler", "other"] as const;
export type MedicineForm = (typeof MEDICINE_FORMS)[number];

export const MEDICINE_FORM_LABELS: Record<MedicineForm, string> = {
  oral: "Tablet / Oral",
  topical: "Cream / Ointment",
  injection: "Injection",
  drops: "Drops",
  inhaler: "Inhaler",
  other: "Other",
};

export const QUANTITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export interface Medicine {
  id: string;
  doctorId: string;
  name: string;
  /** Descriptive fields + the linked IHS catalogue row (backend migration 055); null on older rows. */
  genericName?: string | null;
  manufacturer?: string | null;
  description?: string | null;
  medicineMasterId?: string | null;
  form: MedicineForm;
  /** Tablet / capsule / syrup / … (backend migration 053); null on older rows. */
  dosageForm?: string | null;
  strength: string | null;
  /** The doctor's default instructions (backend migration 054); null on older rows. */
  defaultFrequency?: string | null;
  defaultTiming?: string | null;
  category: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface MedicineCreate {
  name: string;
  genericName?: string | null;
  manufacturer?: string | null;
  description?: string | null;
  /** The IHS catalogue row picked, if any — the server links (or creates) one from the dosage form otherwise. */
  medicineMasterId?: string | null;
  form?: MedicineForm;
  dosageForm?: string | null;
  strength?: string | null;
  defaultFrequency?: string | null;
  defaultTiming?: string | null;
  category?: string | null;
}

export interface MedicineUpdate {
  name?: string;
  genericName?: string | null;
  manufacturer?: string | null;
  description?: string | null;
  medicineMasterId?: string | null;
  form?: MedicineForm;
  dosageForm?: string | null;
  strength?: string | null;
  defaultFrequency?: string | null;
  defaultTiming?: string | null;
  category?: string | null;
  isActive?: boolean;
}

export interface MedicineFilters {
  search?: string;
  category?: string;
  form?: MedicineForm;
}
