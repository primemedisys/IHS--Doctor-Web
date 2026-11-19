# Frontend Plan — Video Consultation (LiveKit)

**Apps:** `frontend-patient/` (port 3000) · `frontend-doctor/` (port 3001). **Stack:** Next.js 16
(App Router) · React 19 · MUI v9 + Emotion · React Query 5 · Axios (bearer interceptor). **Legend:**
🟢 existed · 🟡 extended · 🔵 new.

The two apps share one architecture, so the **`features/consultation/` module + the call page + the
`ConsultationRoom` component are built once and mirrored** (each app keeps its own copy under
`src/`; no cross-app import — same discipline as the twin `HealthRecordTable`). Only the three
**entry points** differ per app. The Axios request interceptor already attaches the bearer token, so
the token request is authorized automatically — nothing new for auth.

---

## Part 0 — Shared plumbing (do in BOTH apps identically)

### 0.1 `package.json` (🟡)
```jsonc
"livekit-client": "^2",
"@livekit/components-react": "^2",
"@livekit/components-styles": "^1"
```
`@livekit/components-react` ships a ready `<VideoConference>` surface (tiles, mic/cam/leave controls,
active-speaker) so v1 needs almost no custom call chrome. It coexists fine with MUI (it's self-styled;
import `@livekit/components-styles` once).

### 0.2 `config/env.ts` (🟡)
Add to the zod schema + exported `env`:
```ts
NEXT_PUBLIC_LIVEKIT_URL: z.string().url().or(z.literal("")),   // wss://<project>.livekit.cloud
```
`.env`/`.env.example` gain `NEXT_PUBLIC_LIVEKIT_URL=wss://<project>.livekit.cloud`. This is the **only**
LiveKit value the browser needs — the token comes from our backend; the API secret never ships.

### 0.3 `constants/api.ts` (🟡)
```ts
// patient app, under API_ENDPOINTS.patient:
bookingVideoToken: (id: string) => `/patient/bookings/${id}/video-token`,
// doctor app, under API_ENDPOINTS.doctor:
bookingVideoToken: (id: string) => `/doctor/bookings/${id}/video-token`,
```

### 0.4 `constants/routes.ts` (🟡)
```ts
// patient: inside dashboard
appointmentCall: (id: string) => `/dashboard/appointments/${id}/call`,
// doctor: alongside writePrescription / patientDescription
call: (bookingId: string) => `/dashboard/appointments/${bookingId}/call`,
```

### 0.5 `constants/queryKeys.ts` (🟡)
```ts
video: {
  all: () => ["video"] as const,
  token: (bookingId: string) => ["video", "token", bookingId] as const,
},
```

### 0.6 Types (🟡)
`types/consultation.ts` (🔵) — mirror the serializers:
```ts
export interface VideoSession {
  status: "pending" | "live" | "ended";
  roomName: string;
  startedAt: string | null; endedAt: string | null; durationSec: number | null;
  doctorJoined: boolean; patientJoined: boolean;
}
export interface VideoToken { url: string; token: string; roomName: string; session: VideoSession | null; }
```
Doctor app also (🟡) adds `meetLink: string | null` to `types/appointment.ts` `Appointment` (the patient
`Booking` type already has `meetLink`).

### 0.7 `features/consultation/services/consultation.service.ts` (🔵)
```ts
import { api, requestData } from "@/services/api";
import { API_ENDPOINTS } from "@/constants/api";
import type { VideoToken } from "@/types/consultation";

export const consultationService = {
  getVideoToken: (bookingId: string) =>
    requestData<VideoToken>(api.post(API_ENDPOINTS.<patient|doctor>.bookingVideoToken(bookingId))),
};
```

### 0.8 `features/consultation/hooks/useVideoToken.ts` (🔵)
A `useMutation` (the token is minted fresh per join; not cached long — it's short-lived and window-bound):
```ts
export function useVideoToken() {
  return useMutation({ mutationFn: (bookingId: string) => consultationService.getVideoToken(bookingId) });
}
```
The call page calls `mutateAsync(bookingId)` on mount. (A `useQuery` with `staleTime:0` is equally fine;
mutation avoids accidental refetch that would mint surplus tokens.)

### 0.9 `features/consultation/components/ConsultationRoom.tsx` (🔵)
The shared call surface. Props: `{ token, url, roomName, selfRole, otherLabel, onLeave }`.
```tsx
"use client";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
// waiting state: subscribe to room via useRemoteParticipants(); until the OTHER party appears,
// overlay "Waiting for {otherLabel} to join…". VideoConference handles tiles + mic/cam/leave.

export function ConsultationRoom({ token, url, onLeave, otherLabel }: Props) {
  return (
    <LiveKitRoom serverUrl={url} token={token} connect audio video
      onDisconnected={onLeave} style={{ height: "100dvh" }}>
      <WaitingOverlay otherLabel={otherLabel} />   {/* uses useRemoteParticipants().length === 0 */}
      <VideoConference />                           {/* prebuilt grid + control bar (mic/cam/leave/screenshare) */}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
```
- **Waiting state** = `useRemoteParticipants()` empty → show "Waiting for {the doctor|the patient}…".
  When the remote participant connects (LiveKit `ParticipantConnected`), the overlay clears — this is the
  **client-side presence** that makes the patient "see the doctor arrive" with zero backend polling.
- **Leave** (`onDisconnected` / the control-bar leave button) → `router.push(ROUTES…appointments)`.
- Renders full-viewport; the dashboard shell's chrome is bypassed on this route (it's a focused call screen).
- **Themed control bar.** The mic / camera / screenshare / leave buttons are restyled to the app theme by
  overriding LiveKit's CSS variables **inline on the `LiveKitRoom` element** (inline wins over the
  `[data-lk-theme="default"]` stylesheet): `--lk-accent-bg`/`--lk-accent-fg` = `theme.palette.primary`,
  `--lk-control-active-bg` = primary, `--lk-danger` = `theme.palette.error` (Leave stays red),
  `--lk-border-radius: 10px`. Typed via `CSSProperties & Record<\`--lk-${string}\`, string>`.

### 0.10 The call page (🔵)
`app/(dashboard)/dashboard/appointments/[id]/call/page.tsx` (both apps):
```tsx
"use client";
// 1. read [id]; 2. useVideoToken().mutateAsync(id) on mount;
// 3. loading → spinner; error → map code → message:
//      VIDEO_WINDOW_CLOSED → "This call isn't open right now."
//      VIDEO_NOT_AVAILABLE → "This appointment isn't a confirmed video consult."
//      VIDEO_NOT_CONFIGURED → "Video isn't available yet." (+ a back button)
// 4. success → <ConsultationRoom token url roomName otherLabel onLeave={back to appointments} />
```
Guarded by the existing `PROTECTED_PREFIX` (`/dashboard`) auth gate — no extra guard needed.

### 0.11 Doctor call-page action bar (🟡 doctor page only)
The **doctor** call page adds a top action bar above the room so the doctor works without leaving the call:
- **Description** → `window.open(ROUTES.dashboard.patientDescription(bookingId), "_blank")` — opens **this
  booking's** patient records/description (record table + history + notes) in a new tab, so the call keeps
  running.
- **Prescription** → `window.open(ROUTES.dashboard.writePrescription(bookingId), "_blank")` — the Rx
  composer for this booking, also in a new tab.
- **Mark as complete** → `useCompleteAppointment().mutate({ id, noShow:false })`; on success →
  `router.push(appointments)`. Navigating away **unmounts `ConsultationRoom`, which disconnects LiveKit** —
  so one click both **completes the appointment and ends the call**. (Completing an attended consult also
  settles any pending payment, per `booking.service.complete`.)
- **Leave** → back to appointments (ends the call by unmounting).

The patient call page keeps the simpler header (title + Leave).

---

## Part A — Patient app entry points

### A.1 `features/booking/components/MyBookingsView.tsx` (🟡) — the "Join" button
The `BookingCard` already reserves the exact spot (the `meetLink` placeholder `Alert`):
```tsx
// BEFORE:
{isVideo && booking.status === "confirmed" && !booking.meetLink && (
  <Alert severity="info">Your join link will appear here before the consult.</Alert>
)}
// AFTER:
{isVideo && booking.status === "confirmed" && (
  <Button variant="contained" startIcon={<FiVideo/>} onClick={() => router.push(ROUTES.dashboard.appointmentCall(booking.id))}>
    Join video call
  </Button>
)}
```
Optionally gate the button's *enabled* state to the join window client-side (open 10 min before →
30 min after) for a nicer UX, but the backend is the real gate (an early click just 403s to a friendly
message on the call page). `booking.meetLink` is now populated post-payment, so the "link will appear"
copy is obsolete.

### A.2 `features/doctors/components/DoctorProfile.tsx` (🟡) — flip "Coming soon"
Today the video card shows a **`Coming soon`** chip and toasts *"Teleconsultation is coming soon"*
instead of booking. Replace that branch so the video card behaves like the clinic card: selecting it sets
`BookingState = { mode: "video" }` and proceeds into the **existing** booking flow — `BookingFlow`
**already supports `mode:"video"`** (video fee from `doctor.onlineFee`, forced online payment). Gate the
card's availability on `doctor.onlineConsult` / `doctor.onlineFee != null` (a doctor who offers video).
This is the "appointment booking" half going live end to end.

*(Mirror any equivalent "coming soon" copy in the doctor app's `DoctorProfile.tsx` "Consultation Modes"
section — display-only, no behavior there.)*

---

## Part B — Doctor app entry point

### B.1 `features/appointments/components/AppointmentDetailDialog.tsx` (🟡) — the "Join" action
Add a **"Join video call"** button to the dialog's action stack (near *Mark complete*), shown only when
the appointment is a **confirmed video** consult (`appointment.mode === "video" && status === "confirmed"`).
It `router.push`es to `ROUTES.dashboard.call(appointment.id)`. Wire `meetLink` through
`types/appointment.ts` (🟡, §0.6) and `appointment.service.ts`/the serializer read so the dialog can also
surface the "patient is waiting" hint from `videoSession` if desired (optional for v1).
`AppointmentsBoard` already renders the video/clinic chip — no board change required.

---

## Cross-cutting UI notes

- **Theme & responsiveness.** The call page is full-viewport (`100dvh`); LiveKit components are self-styled
  and work in light/dark. Keep the page body from horizontal-scrolling — the video grid manages its own layout.
- **Permissions.** `LiveKitRoom connect audio video` triggers the browser camera/mic prompt; the call page
  should show a friendly "allow camera & microphone" hint if `getUserMedia` is denied (LiveKit surfaces this
  via a connection error → map to a clear message + retry).
- **One token per join.** Don't cache the token across navigations — it's short-lived and window-bound; the
  mutation re-mints on each page mount.
- **No new global state.** Everything is local to the call route + the two "Join" buttons; no context/provider.

---

## Build order (frontend)

1. **Shared plumbing (Part 0)** in the **patient** app: deps → env → constants/types → service + hook →
   `ConsultationRoom` → call page.
2. **Patient entry points (Part A):** *My Bookings* "Join" button → flip *DoctorProfile* "Coming soon".
3. **Mirror Part 0** into the **doctor** app (copy the module, swap the endpoint to `/doctor/…`).
4. **Doctor entry point (Part B):** the detail-dialog "Join" action + `meetLink` type/serializer wiring.
5. `tsc --noEmit` + ESLint clean on both; smoke-test the call page against the live backend token endpoint.
