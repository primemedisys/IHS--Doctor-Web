# Follow-up reminders — frontend plan

🔵 Planned. Two apps: the doctor configures reminders inside the existing follow-up panel, and the
patient sees upcoming follow-ups on their dashboard.

---

## 1. Doctor app (`frontend-doctor`)

### 1.1 Types

🔵 `src/types/followUp.ts` — extend with:

```ts
export interface FollowUpReminder {
  id: string;
  bookingId: string;
  followUpOn: string;       // "YYYY-MM-DD"
  reminderAt: string;       // ISO datetime
  channel: "email" | "whatsapp" | "both";
  status: "pending" | "processing" | "sent" | "failed" | "cancelled";
  emailStatus: "pending" | "sent" | "failed";
  whatsappStatus: "pending" | "sent" | "failed";
  sentAt: string | null;
}

export interface SetReminderInput {
  reminderDaysBefore?: number | null;
  reminderAt?: string | null;
  channel?: "email" | "whatsapp" | "both" | null;
}
```

### 1.2 API endpoints

🔵 `constants/api.ts` — add:

```ts
bookingReminder: (bookingId: string | number) => `/doctor/bookings/${bookingId}/reminder`,
```

### 1.3 Service

🔵 `features/follow-ups/service.ts` — extend:

```ts
getBookingReminder(bookingId: string) {
  return api.get<ApiResponse<FollowUpReminder | null>>(
    API_ENDPOINTS.doctor.bookingReminder(bookingId)
  );
},
setBookingReminder(bookingId: string, input: SetReminderInput) {
  return api.put<ApiResponse<FollowUpReminder>>(
    API_ENDPOINTS.doctor.bookingReminder(bookingId), input
  );
},
clearBookingReminder(bookingId: string) {
  return api.delete<ApiResponse<{ id: string }>>(
    API_ENDPOINTS.doctor.bookingReminder(bookingId)
  );
},
```

### 1.4 Hooks

🔵 `features/follow-ups/hooks.ts` — extend:

```ts
export function useBookingReminder(bookingId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.followUps.reminder(bookingId ?? ""),
    queryFn: () => followUpService.getBookingReminder(bookingId!),
    enabled: Boolean(bookingId),
  });
}

export function useSetBookingReminder(bookingId: string) {
  const invalidate = useFollowUpInvalidation();
  return useMutation({
    mutationFn: (input: SetReminderInput) => followUpService.setBookingReminder(bookingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followUps.reminder(bookingId) });
      invalidate();
    },
  });
}

export function useClearBookingReminder(bookingId: string) { /* ... */ }
```

🟢 `constants/queryKeys.ts` — extend `followUps` with:

```ts
reminder: (bookingId: string) => [...queryKeys.followUps.all(), "reminder", bookingId] as const,
```

### 1.5 🟡 FollowUpPanel — reminder configuration

**File:** `features/follow-ups/components/FollowUpPanel.tsx`

The existing panel has two fields: Status select + "Expected back on" date. The reminder config is
added **below** the date field, inside the same panel. No new page, no new dialog.

```
┌──────────────────────────────────────┐
│ Status   [ ● OPD FU           ▾ ]   │
│ Expected back on                     │
│ [ 2026-10-07              ]          │
│                                      │
│ ── Reminder ──────────────────────── │
│                                      │
│ Remind   [ 3 days before    ▾ ]     │
│ Channel  [x] Email  [x] WhatsApp    │
│                                      │
│ ● Saved                              │
│                            Manage →  │
└──────────────────────────────────────┘
```

**Behaviour:**
- The reminder section only appears when a follow-up date is set (no date = no reminder).
- "Remind" dropdown options: `No reminder`, `1 day before`, `3 days before`, `7 days before`,
  `Custom`.
- "Custom" shows a datetime picker.
- Channel checkboxes: Email (always enabled if patient has email), WhatsApp (enabled only if
  patient has phone AND `whatsapp_opt_in`).
- Auto-saves like the existing status/date fields (debounced).
- If the doctor clears the follow-up date, the reminder is automatically cancelled.

### 1.6 🟡 Appointments board — reminder indicator

**File:** `features/appointments/components/AppointmentsBoard.tsx`

Add a small indicator in the Follow-up column next to the `FollowUpChip`:

- **Pending reminder:** a clock icon (FiClock) in muted colour.
- **Sent reminder:** a check icon (FiCheck) in success colour.
- **Failed reminder:** an alert icon (FiAlertTriangle) in error colour.
- **No reminder:** nothing extra (the existing chip is enough).

This is purely visual — the data comes from the `followUp` object already attached to each booking
row. The `followUp` serializer is extended to include `reminder: { status, channel }` (see
backend-plan §7).

---

## 2. Patient app (`frontend-patient`)

### 2.1 Types

🔵 `src/types/followUp.ts` (new file):

```ts
export interface UpcomingFollowUp {
  id: string;
  bookingId: string;
  doctorName: string;
  clinicName: string | null;
  followUpOn: string;
  status: "pending" | "sent";
  reminder: {
    status: string;
    channel: string;
  } | null;
}
```

### 2.2 API endpoints

🟡 `constants/api.ts` — add:

```ts
patient: {
  // ...existing...
  upcomingFollowUps: "/patient/follow-ups/upcoming",
  whatsappOptIn: "/patient/profile/whatsapp-opt-in",
},
```

### 2.3 Route

🟡 `constants/routes.ts` — add under `dashboard`:

```ts
followUps: "/dashboard/follow-ups",
```

### 2.4 Nav

🟡 `features/dashboard/nav.ts` — add to "Main" group, after "Appointments":

```ts
{ label: "Follow-ups", href: ROUTES.dashboard.followUps, icon: "FiClock" },
```

### 2.5 🔵 Upcoming Follow-ups page

**Route:** `/dashboard/follow-ups`

**File:** `app/(dashboard)/dashboard/follow-ups/page.tsx` → `FollowUpsPage`

```
┌──────────────────────────────────────────────────────┐
│ Upcoming Follow-ups                                   │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Dr. Priya Sharma                                 │  │
│ │ Apollo Clinic, Bhubaneswar                       │  │
│ │                                                   │  │
│ │ Follow-up: 7 October 2026                        │  │
│ │ Status: ● Upcoming                               │  │
│ │ Reminder: Email + WhatsApp                       │  │
│ │                                                   │  │
│ │ [Book appointment]                                │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Dr. Rajesh Kumar                                 │  │
│ │ no clinic (video consult)                        │  │
│ │                                                   │  │
│ │ Follow-up: 22 October 2026                       │  │
│ │ Status: ● Upcoming                               │  │
│ │ Reminder: Email only                             │  │
│ │                                                   │  │
│ │ [Book appointment]                                │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ ── Past follow-ups ────────────────────────────────  │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Dr. Priya Sharma · 15 Aug 2026                   │  │
│ │ Status: ● Completed                              │  │
│ └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

- **Upcoming section:** follow-ups where `follow_up_on >= CURDATE()` and status is `pending` or `sent`.
- **Past section:** follow-ups where `follow_up_on < CURDATE()` or status is `completed`/`cancelled`.
- Each card shows doctor name, clinic, date, and reminder channel.
- "Book appointment" links to the existing booking flow for that doctor.

### 2.6 🔵 Service + hooks

**File:** `features/follow-ups/service.ts` (new feature module in patient app)

```ts
export const followUpService = {
  getUpcoming() {
    return requestData<UpcomingFollowUp[]>(
      api.get<ApiResponse<UpcomingFollowUp[]>>(API_ENDPOINTS.patient.upcomingFollowUps)
    );
  },
  setWhatsAppOptIn(optedIn: boolean) {
    return requestData<{ whatsappOptIn: boolean }>(
      api.patch<ApiResponse<{ whatsappOptIn: boolean }>>(
        API_ENDPOINTS.patient.whatsappOptIn, { whatsappOptIn: optedIn }
      )
    );
  },
};
```

### 2.7 🟡 Settings — WhatsApp opt-in toggle

**File:** `features/settings/components/SettingsView.tsx` (or wherever the patient settings live)

Add a "Communication preferences" section with a toggle:

```
Communication preferences
  [x] Receive follow-up reminders via WhatsApp
```

This calls `PATCH /patient/profile/whatsapp-opt-in`.

---

## 3. Cache keys

🟢 `constants/queryKeys.ts` (doctor app):

```ts
followUps: {
  // ...existing...
  reminder: (bookingId: string) => [...queryKeys.followUps.all(), "reminder", bookingId] as const,
}
```

🔵 `constants/queryKeys.ts` (patient app — new file):

```ts
export const queryKeys = {
  followUps: {
    all: () => ["follow-ups"] as const,
    upcoming: () => [...queryKeys.followUps.all(), "upcoming"] as const,
  },
};
```

| Mutation | Invalidates |
|---|---|
| set / clear reminder | `followUps.reminder(id)`, `appointments.all()` |
| toggle WhatsApp opt-in | patient profile cache |
