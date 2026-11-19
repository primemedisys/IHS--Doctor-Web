# Frontend — Booking & Payments

**Apps:** `frontend-patient/` (Next.js — book, pay, profile) and `frontend-doctor/` (appointments + patient snapshot). Both are MUI + TanStack Query + Axios with the shared `{ success, message, data }` envelope, the `api.ts` refresh-on-401 client, and the `feature/{components,hooks,services,schemas,types}` layout already used by `features/doctors` and `features/auth`.

Read `README.md` (gates, state machine) and `backend-plan.md` (contracts) first. **Legend:** 🟢 exists · 🟡 extend · 🔵 new. The existing `BookingDialog.tsx` already renders the exact 3-step flow with a **mocked** `confirm()` — most of this plan is swapping that mock for real calls, not new UI.

---

## Part A — `frontend-patient/`

### A1. The gate around "Book now" (README §2)

Enforced server-side; the UI mirrors it so users never hit a dead end.

`features/doctors/components/DoctorProfile.tsx` 🟡 — the "Book Visit" / "Book Video Consult" CTA handler becomes:

```ts
function onBook(mode, clinic?) {
  if (!isAuthenticated)      return router.push(`${ROUTES.auth.login}?next=${encodeURIComponent(currentUrl)}`);
  if (!profile?.status.complete) return router.push(`${ROUTES.profile.complete}?next=${encodeURIComponent(currentUrl)}`);
  openBookingDialog(mode, clinic);
}
```

- `isAuthenticated` from `useAuth()` 🟢. `profile` from a new `usePatientProfile()` hook (A2). The `next` param is honoured by `LoginForm`/`RegisterForm` 🟡 (they already redirect post-auth — point them at `next` when present) and by the profile form (A3).
- **Do not** hide the CTA when logged-out; show it and gate on click, so the doctor page stays SEO/preview-friendly (the app SSRs profiles).

### A2. Patient profile service + hooks 🔵

- `types/patient.ts` 🔵 — `PatientProfile`, `PatientProfileStatus { complete: boolean; missing: string[] }`.
- `features/profile/services/patient.service.ts` 🔵 — `getProfile()`, `updateProfile(patch)` via `requestData(api.get/put(...))`.
- `features/profile/hooks/` 🔵 — `usePatientProfile()` (query, `queryKey: ["patient","profile"]`), `useUpdateProfile()` (mutation → invalidate the profile key). Add endpoints to `constants/api.ts` 🟡 (`patient.profile`, `patient.bookings`).

### A3. Profile-completion screen 🔵

`app/profile/complete/page.tsx` (+ route in `constants/routes.ts` 🟡). A MUI form for the required set (`phone, dateOfBirth, gender, city`) plus optional fields, validated by a Zod schema in `features/profile/schemas` (mirror `features/auth/schemas`). On save → `useUpdateProfile()` → toast → `router.push(next ?? doctorUrl)`. Show the `status.missing` list as helper text so the patient sees exactly what's blocking booking. Reuse this screen as the patient's editable "My Profile" too (same form, no `next`).

### A4. Real slots (already wired, verify only) 🟡

`BookingDialog` currently builds days from `generateSlots(config)` (client-side mock expansion). Replace with the real endpoint the clinics plan shipped:

- `features/doctors/services/doctor.service.ts` 🟡 — add `getSlots({ doctorId, mode, clinicId?, date })` → `GET /doctors/:id/slots`.
- `features/doctors/hooks` 🟡 — `useDoctorSlots(params)` (query keyed by all params; `enabled` when the dialog is open + a date is chosen). The response is already **free** slots (backend §4), so no client-side booking subtraction.
- Keep the date-strip UX; fetch times per selected date (or prefetch the next N days). Show the existing "No slots available" `Alert` on an empty list.

### A5. Rewrite `BookingDialog` confirm → real create + pay (the core) 🟡

Keep the 3-step `Stepper` (Choose slot → Payment → Confirmed) and all the presentational sub-components. Replace `confirm()` (currently `await sleep(1200)`) with:

```
Step 1 (Choose slot):  select date + slot from useDoctorSlots.
Step 2 (Payment):      choose paymentMode (video → forced 'online'; clinic → 'online' | 'offline').
onConfirm:
  1. createBooking({ doctorId, mode, clinicId, date, startTime, paymentMode })
       → returns { booking, payment, razorpayOrder? }
  2a. paymentMode === 'offline':  booking is already 'confirmed' → go to Step 3 (Confirmed).
  2b. paymentMode === 'online':   openRazorpayCheckout(razorpayOrder, booking)  (A6)
        on success (handler) → verifyPayment(booking.id, rzpResponse) → Step 3.
        on dismiss/failure   → stay on Step 2, toast "Payment cancelled — your slot is held for a few minutes."
  3. On SLOT_TAKEN (409): toast "That slot was just taken" + refetch slots + back to Step 1.
     On PROFILE_INCOMPLETE (409): close dialog + route to /profile/complete (belt-and-suspenders).
```

- `features/booking/services/booking.service.ts` 🔵 — `createBooking(body)`, `verifyPayment(id, {razorpayPaymentId, razorpayOrderId, razorpaySignature})`, `listBookings()`, `getBooking(id)`, `cancelBooking(id)`.
- `features/booking/hooks` 🔵 — `useCreateBooking()`, `useVerifyPayment()`, `useMyBookings()`. On confirm, invalidate `useDoctorSlots` + `useMyBookings`.
- The `mode: 'video' | 'clinic'` the dialog already uses maps 1:1 to the create-contract `mode` (backend translates to `booking_type`). No enum churn.

### A6. Razorpay Checkout loader 🔵

Razorpay's `checkout.js` is a script, loaded lazily (no npm client SDK needed).

- `utils/razorpay.ts` 🔵 — `loadRazorpayScript()` (idempotent `<script src="https://checkout.razorpay.com/v1/checkout.js">` injection, resolves once loaded) + `openRazorpayCheckout(order, { prefill, onSuccess, onDismiss })`:

```ts
const rzp = new window.Razorpay({
  key: order.keyId,               // public RAZORPAY_KEY_ID from the create response — never a secret
  order_id: order.orderId,
  amount: order.amount, currency: order.currency,
  name: "Indian Health System", description: "Consultation booking",
  prefill: { name: user.name, email: user.email, contact: user.phone },
  handler: (resp) => onSuccess(resp),   // { razorpay_payment_id, razorpay_order_id, razorpay_signature }
  modal: { ondismiss: onDismiss },
  theme: { color: <brand> },
});
rzp.open();
```

> The `keyId` comes from the backend create response (`serializeRazorpayOrder`), so the public key lives in one place. `NEXT_PUBLIC_RAZORPAY_KEY_ID` is optional/redundant — prefer the value the API returns. **CSP:** allow `checkout.razorpay.com` and `api.razorpay.com` in the app's script/connect/frame `Content-Security-Policy` (Next config) — the modal opens an iframe.

### A7. My Bookings 🔵

`app/bookings/page.tsx` (+ nav link + route). `useMyBookings()` → cards grouped by status: upcoming (`confirmed`), pending payment (with a "Complete payment" button that reopens Checkout for that booking's order), past (`completed`), `cancelled`. Each card: doctor, mode chip (video/clinic), date/time, amount, payment state, and — for confirmed video — a placeholder "Join link will appear before your consult" (the Meet link lands with the video plan). Cancel button on upcoming (calls `cancelBooking`, confirms via a dialog).

### A8. Remove the mock

Delete the `sleep`-based confirm and any `generateSlots` mock usage in the booking path; drop `Demo environment — no real payment` copy. The `Confirmed` step keeps its summary but reads the real `booking` (with the offline "pay at clinic" vs "paid online" line driven by `payment.status`).

---

## Part B — `frontend-doctor/`

The doctor already has an app shell, auth, onboarding, and clinic/availability screens. This adds the **Appointments** surface — the reason patients were forced to complete their profile.

### B1. Appointments list 🔵

- `app/appointments/page.tsx` (+ nav). `features/appointments/services` 🔵 `listAppointments({status,date,clinicId})` → `GET /doctor/bookings`; `useAppointments()` hook.
- A filterable table/cards: patient name, mode chip, date/time, clinic (or "Video"), status, payment (`paid online` / `pay at clinic` / `pending`). Row → detail (B2). Filters for status/date/clinic map straight to the query params.

### B2. Appointment detail + patient snapshot 🔵

- `getAppointment(id)` → `GET /doctor/bookings/:id`; `useAppointment(id)`.
- Left: booking facts (mode, date/time, clinic address for in-clinic, amount, payment status). Right: **patient snapshot** — the data the patient saved: name, age (derived from DOB), gender, blood group, city; allergies (with severity), chronic conditions, current medications, and uploaded past records (links). This is only populated by the backend for `confirmed`/`completed` bookings (backend §5.2) — for a `pending_payment` row, show "Patient details unlock once the booking is confirmed."
- Actions: **Mark as paid** (offline bookings with `pending_at_clinic` → `POST /doctor/bookings/:id/mark-paid`), **Mark complete / no-show** (`.../complete`). Mutations invalidate the list + detail.

### B3. Types 🔵

`types/appointment.ts` — `Appointment` (list row) + `AppointmentDetail` (with `PatientSnapshot`). Mirror the backend `serializeBookingForDoctor` / `serializePatientSnapshot` field-for-field so no mapping layer is needed (same discipline as the doctor-listing plan's "subset of the frontend type" rule).

---

## C. Cross-app conventions

- **All money display** via the existing `formatCurrency` util; amounts arrive as `number` (backend coerces DECIMAL).
- **Error → UX map** (from the `{ error: { code } }` envelope): `SLOT_TAKEN` → refetch slots + toast; `PROFILE_INCOMPLETE` → route to profile; `SLOT_UNAVAILABLE` → toast + back to slot step; `PAYMENT_VERIFICATION_FAILED` → toast "Payment could not be verified — if you were charged it will auto-refund" + keep the booking pending. Centralise this in a small `bookingErrorToast(err)` helper so both apps behave identically.
- **Loading/optimism:** disable the confirm button while the create/verify mutation is in flight (the dialog already has a `processing` state — reuse it). Never optimistically show "Confirmed" before `verify` resolves.
- **Env:** `frontend-patient` optionally `NEXT_PUBLIC_RAZORPAY_KEY_ID` (redundant — prefer the API's `keyId`); no secrets in any frontend.

---

## D. Build order (frontend)

1. **Patient profile** (A2–A3) + the **gate** (A1) — testable against the Phase-0 backend before any booking exists.
2. **Real slots** (A4) — `BookingDialog` reads `/doctors/:id/slots`; verify free slots render.
3. **Offline booking** (A5 offline branch + A7 My Bookings) — end-to-end without Razorpay: create → confirmed → shows in My Bookings and (B1) in the doctor's Appointments with the snapshot (B2).
4. **Razorpay online** (A5 online branch + A6) — Checkout → verify → confirmed; pending-payment resume from My Bookings.
5. **Doctor actions** (B2 mark-paid/complete) + the error-UX polish (C).

---

## E. Testing checklist (frontend)

- [ ] Logged-out "Book now" → `/login?next=…`; after login the user lands back on the doctor page with the dialog reopenable.
- [ ] Logged-in but incomplete profile → `/profile/complete`; after saving the required fields → returned to booking.
- [ ] The slot grid shows only **free** times; booking a slot in one tab removes it from a second tab after refetch.
- [ ] Offline clinic booking → "Confirmed" step shows "pay at clinic"; appears in My Bookings (pending payment at clinic) and in the doctor's Appointments with the patient snapshot.
- [ ] Video booking forces online payment; Razorpay modal opens with the correct amount; on success the dialog advances to Confirmed and the booking is `confirmed`.
- [ ] Dismissing the Razorpay modal keeps the booking recoverable from My Bookings → "Complete payment" reopens Checkout for the same order.
- [ ] A `SLOT_TAKEN` during confirm shows a clear toast and returns to slot selection with fresh slots.
- [ ] Doctor sees the patient snapshot only for confirmed/completed bookings; a pending booking shows the "unlocks on confirmation" message.
- [ ] Doctor "Mark as paid" flips an offline booking's payment state; "Mark complete"/"no-show" update status; lists refetch.
- [ ] No secret key is present anywhere in the client bundle; the Razorpay `keyId` used is the one returned by the create call.
- [ ] `formatCurrency` renders every amount; no `Demo environment` copy or `sleep`-based mock remains in the booking path.
