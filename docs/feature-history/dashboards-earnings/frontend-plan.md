# Frontend — Dashboards & Earnings

Three Next.js apps, one job: delete every mock array and render the aggregates the backend now computes. Read `README.md §1` (what is fake) and `§5` (the metric dictionary) first.

All three apps share the same stack — Next 15 App Router, MUI 9, TanStack Query v5, axios — and the same `src/features/dashboard/` scaffold. They are **separate deployments with copy-pasted scaffolds**, not a monorepo with a shared package, so "shared" below means *the same file written in each app*, not an import across app boundaries.

---

## 1. What lands where

Per app (`frontend-patient/`, `frontend-doctor/`, `frontend-admin/`):

```
src/
  features/dashboard/
    data.ts                              DELETE  every mock lives here
    services/dashboard.service.ts        NEW     typed API calls
    hooks/useDashboardSummary.ts         NEW     React Query wrappers
    hooks/index.ts                       NEW
    components/overviews.tsx             REWRITE tiles from the API
    components/pages.tsx                 EDIT    (doctor) EarningsView, AppointmentsView
    components/TrendChart.tsx            EDIT    accept a real series + empty state
  types/dashboard.ts                     NEW     the response contracts
  constants/api.ts                       EDIT    the new endpoint paths
  constants/queryKeys.ts                 EDIT    the new key factories
```

Doctor-only additions:

```
  features/dashboard/components/EarningsLedger.tsx   NEW  the paginated transaction table
  features/dashboard/hooks/useEarnings.ts            NEW  summary + series + transactions
```

---

## 2. Phase 0 — delete the mocks first

This ships on its own, before any backend work. It is the only phase that removes a user-visible lie.

**Delete outright:**

| App | Symbol | Why |
|---|---|---|
| doctor | `earningsSeries` in `data.ts` | Six fabricated months rendered as a chart |
| doctor | the `₹38,000` literal in `EarningsView` | A payout obligation with no table behind it |
| doctor | `doctorAppointments` in `data.ts` | Fake patient names ("Subham Panda", …) |
| admin | `bookingsSeries`, `verificationQueue` in `data.ts` | Fabricated series + fake queue |
| admin | `1,284`, `700`, `152000` literals in `AdminOverview` | Fabricated platform metrics |

**Keep from `data.ts`:** the `DashAppointment` / `ApptStatus` / `ApptMode` **types**. `AppointmentList` and the patient's `toDashRow()` already depend on them. Move them to `src/types/dashboard.ts` and delete the file. Nothing should be able to `import { earningsSeries }` ever again — that's the point of deleting rather than emptying.

**Neutralize, don't hide, the admin verification buttons.** Today:

```tsx
const approve = (name: string) => toast.success(`Approved ${name}`);   // ← calls nothing
```

An admin clicks ✓, sees "Approved Dr. Rao", and **nothing happens**. Until Phase 5 wires the real mutation, the buttons render `disabled` with a tooltip: *"Verification actions are being connected."* A disabled button that does nothing is honest; an enabled button that does nothing while congratulating you is not.

After Phase 0 the three dashboards are visibly incomplete — em-dashes, empty states, a disabled control. That's the correct intermediate state.

---

## 3. Types — `src/types/dashboard.ts`

Mirror the backend serializers exactly (`backend-plan.md §7`). Money is `number` (rupees, 2 dp) because the serializer already cast it; the component never sees a `DECIMAL` string.

```ts
/** Nullable where the backend has no data source yet — never 0, never NaN. */
export interface DoctorDashboardSummary {
  todaysAppointments: number;
  patientsThisMonth: number;
  /** `null` until the reviews table exists. Renders as "—", not "0 stars". */
  averageRating: number | null;
  earnedThisMonth: number;
}

export interface EarningsSummary {
  gross: number;
  commission: number;
  net: number;
  refunded: number;
  consults: number;
  /** `null` when consults === 0. Guard before formatting. */
  averagePerConsult: number | null;
  /** Cash owed by patients at the clinic — NOT a platform payout. */
  awaitingCollection: number;
}

export interface EarningsBucket {
  /** "2026-07" for month granularity, "2026-07-04" for day. */
  bucket: string;
  gross: number; commission: number; net: number; consults: number;
}

export interface AdminDashboardSummary {
  verifiedDoctors: number;
  pendingVerifications: number;
  bookingsThisMonth: number;
  /** Commission, NOT gross merchandise value. Label it as such. */
  platformRevenue: number;
  gmv: number;
  doctorPayouts: number;
}
```

`averageRating: number | null` forces every call site to handle the absent case at the type level. That's the whole reason the backend returns `null` instead of `0`.

---

## 4. Services + hooks

`constants/api.ts` gains the paths (doctor app shown):

```ts
doctor: {
  dashboardSummary:    "/doctor/dashboard/summary",
  earningsSummary:     "/doctor/earnings/summary",
  earningsSeries:      "/doctor/earnings/series",
  earningsTransactions:"/doctor/earnings/transactions",
},
```

`constants/queryKeys.ts` gains a factory whose keys **include the period**, so switching the range refetches instead of serving a cached six-month chart under a "Last 30 days" label:

```ts
dashboard: {
  all: () => ["dashboard"] as const,
  summary: () => [...queryKeys.dashboard.all(), "summary"] as const,
},
earnings: {
  all: () => ["earnings"] as const,
  summary: (p: Period) => [...queryKeys.earnings.all(), "summary", p] as const,
  series:  (p: Period) => [...queryKeys.earnings.all(), "series", p] as const,
  transactions: (p: Period, page: number) =>
    [...queryKeys.earnings.all(), "tx", p, page] as const,
},
```

Services follow the existing `booking.service.ts` shape — unwrap `res.data.data`, return the typed payload, let the axios interceptor handle auth refresh and error normalization. No `try/catch` in the service.

Hooks:

```ts
/** Doctor's tiles. Cheap, changes on booking/payment mutations. */
export function useDoctorDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: dashboardService.getDoctorSummary,
    staleTime: 60_000,
  });
}

/**
 * The ledger. `placeholderData: keepPreviousData` keeps the previous page's
 * rows on screen while the next page loads, so paging doesn't flash an empty
 * table and collapse the page height.
 */
export function useEarningsTransactions(period: Period, page: number) {
  return useQuery({
    queryKey: queryKeys.earnings.transactions(period, page),
    queryFn: () => earningsService.getTransactions(period, page),
    placeholderData: keepPreviousData,
  });
}
```

**Invalidate on mutation.** `POST /doctor/bookings/:id/mark-paid` and `/complete` both change the numbers on the dashboard. Their existing mutation hooks must add:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.earnings.all() });
}
```

Without this a doctor marks a consult paid and their "Earned this month" tile doesn't move until a hard refresh — which reads, to them, as the payment not registering. Invalidating the *root* key (`["earnings"]`) catches every period and page variant at once.

---

## 5. Patient — stop counting in the browser

`features/dashboard/components/overviews.tsx` today:

```tsx
const { data: bookings } = useMyBookings();          // fetches the ENTIRE list
const upcoming  = list.filter((b) => b.status === "confirmed");
const completed = list.filter((b) => b.status === "completed");
const doctorsConsulted = new Set(list.map((b) => b.doctor.id)).size;
```

Correct today only because `GET /patient/bookings` returns everything. The moment it grows a `?page=` — and it should; `docs/doctor-discovery-sql` flagged the bookings list as still unpaginated — these tiles start counting *the first page* and silently under-report. The user sees "2 completed" when they have forty.

Replace with `useDashboardSummary()`. The page keeps `useMyBookings()` **only** for the two appointment lists it actually renders (upcoming, recent visits), which are `.slice(0, 4)` anyway. Counts come from the server. The `toDashRow()` mapper and `timeLabel()` helper stay exactly as they are.

Add "Total spent" as a fifth tile — the patient's gross (`payments.amount`), which is what they paid. Commission is invisible to them and must not appear anywhere in this app.

---

## 6. Doctor — the real work

### 6.1 `DoctorOverview`

Four tiles, from `useDoctorDashboardSummary()`:

| Tile | Source | Absent case |
|---|---|---|
| Today's appointments | `todaysAppointments` | `0` is a real answer — render it |
| Patients this month | `patientsThisMonth` | `0` is real |
| Average rating | `averageRating` | `null` → `—`, tooltip *"Ratings launch with reviews."* |
| Earned this month | `earnedThisMonth` | `0` is real → `₹0` |

The "Earnings — last 6 months" card gets a real `TrendChart` fed by `useEarningsSeries({ months: 6 })`. Its current permanent `EmptyState` becomes conditional: render the chart when `series.some(b => b.consults > 0)`, the empty state when the doctor has **never** been paid. A month with zero consults inside an otherwise active six months is a **₹0 point on the line**, not an empty state (`README §9`).

"Today's schedule" wires to the `GET /doctor/bookings` endpoint that **already exists and is already used by the appointments page** — filtered to `slotDate === today`.

### 6.2 `AppointmentsView`

Currently hardcoded to `<AppointmentList appointments={[]} />` with a comment claiming "no appointments data source yet." **That comment is stale** — `doctorBooking.routes.js` has exposed `GET /doctor/bookings` since the booking plan shipped, and the doctor app's own appointments page consumes it. Delete the comment, call the hook, render the rows.

### 6.3 `EarningsView` — rebuilt

```
┌─────────────────────────────────────────────────────────────┐
│ Earnings                        [ 30d ][ 3m ][ 6m ][ 1y ]   │  ← period toggle
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Net earnings │ Gross        │ Commission   │ Consults paid  │
│ ₹1,29,200    │ ₹1,52,000    │ ₹22,800      │ 186            │
│              │              │ (15%)        │ avg ₹695       │
├──────────────┴──────────────┴──────────────┴────────────────┤
│  ⓘ Awaiting collection: ₹4,500 — cash owed by patients at   │
│    your clinic. Platform settlement isn't live yet.         │
├─────────────────────────────────────────────────────────────┤
│  Net earnings trend                    [chart, zero-filled] │
├─────────────────────────────────────────────────────────────┤
│  Transactions                                     [ledger]  │
│  Date       Patient      Mode    Gross   Comm.    Net       │
│  4 Jul      A. Mishra    Video   ₹800    ₹120     ₹680      │
│  …                                          ‹ 1 2 3 ›       │
└─────────────────────────────────────────────────────────────┘
```

Four points, each replacing a specific fabrication:

1. **Net is the headline**, gross is secondary. The doctor is paid net. Showing gross large and net small (or showing only one) is how a doctor budgets against money they'll never receive.
2. **Commission is shown, not hidden.** `₹22,800 (15%)`. A platform that takes a cut and doesn't display it invites the support ticket.
3. **No "Next payout" card.** It's replaced by the "Awaiting collection" note, which is real (`pending_at_clinic` sum) and explicitly *not* a platform payout — the copy says so. When a `payouts` table exists, this becomes a real card.
4. **The ledger exists so the total is auditable.** A doctor who distrusts `₹1,29,200` can page through 186 rows and add them up. `backend-plan.md §9.3` asserts they reconcile.

`averagePerConsult` is `null` at zero consults. Render `—`, not `₹NaN`, not `₹0`. Guard once at the top of the tile.

### 6.4 `TrendChart`

Currently takes `{ month: string; value: number }[]` — the exact shape of the mock. Generalize to `{ label: string; value: number }[]` and let the caller map. Add:

- an **empty state** when `data.length === 0` (never happens post-zero-fill, but a chart component shouldn't assume its caller);
- an **all-zero state** — a flat line at zero with no explanation reads as broken. When every `value === 0`, render the axis plus a muted "No earnings in this period" overlay.
- a `format` prop already exists and is used correctly (`(v) => ₹${formatCompactNumber(v)}`) — keep it.

`recharts` is already a dependency in all three apps.

---

## 7. Admin

### 7.1 Tiles

Six figures from `useAdminDashboardSummary()`. The critical change is **labelling**, not plumbing:

- The current tile says **"Revenue (MTD) ₹152,000"**. Revenue *of what*? Under the money model that number is **commission** — the platform's actual income — but a reader assumes GMV.
- Ship two adjacent tiles: **"Platform revenue (commission)"** and **"Gross bookings value (GMV)"**, plus **"Doctor payouts"**. `commission + payouts === gmv` is visible on the page, which makes a broken aggregate obvious at a glance.

### 7.2 Verification queue — connect the buttons

The single highest-value fix in this plan. Replace the `toast.success` fakes with the endpoints that already exist:

```ts
// GET /admin/doctors?status=pending&limit=5   → adminDoctor.listForReview
// POST /admin/doctors/:id/verify              → adminDoctor.verify
//   body: { decision: "approved" | "rejected", notes?: string }   ← doctor.validator.js:131
const verify = useMutation({
  mutationFn: ({ id, decision, notes }) => adminService.verifyDoctor(id, { decision, notes }),
  onSuccess: (_d, { decision }) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.verification.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });  // the pending count tile
    toast.success(decision === "approved" ? "Doctor approved" : "Doctor rejected");
  },
  onError: (e) => toast.error(getErrorMessage(e)),   // the toast now reflects reality
});
```

The body is `{ decision, notes }` — `decision` is the string `"approved"` or `"rejected"` (not a boolean), and the free-text field is **`notes`**, capped at 500 chars. Match `validators/doctor.validator.js:131`; don't invent a `reason` field.

Two rules:

- **Reject requires an explanation.** Joi allows `notes` to be empty; the **UI** must not. Open the existing `ConfirmDialog` with a required text field on the reject path. A rejection with no notes is a doctor who can't fix their application.
- **Approve confirms too.** It grants a doctor public visibility and booking capability. One misclick in a five-row list shouldn't do that silently.

The `toast` fires from `onSuccess`, never before the mutation resolves. That inversion is the entire bug.

---

## 8. Loading, empty, error — the three states every tile needs

The current code has one state: *render the literal*. Each surface needs three, and the existing `components/feedback/` primitives (`Loading`, `EmptyState`, `ErrorState`, `Skeletons`) already provide them.

| State | Tiles | Chart | Ledger |
|---|---|---|---|
| Loading | `<Skeleton>` in the tile, preserving height | Skeleton block at chart height | Skeleton rows at page size |
| Error | `<ErrorState onRetry={refetch} />` for the whole card — **not** a `0` | same | same |
| Empty | `0` / `—` (a real answer) | `EmptyState` only if *never* any data | `EmptyState` |

**A failed fetch must never render `0`.** `data?.net ?? 0` inside a component turns a 500 into "₹0 earned this month," which is indistinguishable from a real zero and far more alarming. Branch on `isError` *before* reading `data`, and let the skeleton hold layout height so the page doesn't jump.

---

## 9. Verification

Drive the real apps; don't stop at typecheck. `docs/../verify` bootstrapping applies.

1. **The mocks are gone.** `rg "earningsSeries|bookingsSeries|verificationQueue|38000|1,284" frontend-*/src` returns nothing.
2. **Doctor earnings reconcile in the UI.** Seed ~20 payments across three months, both modes. The "Net earnings" tile equals the sum of the ledger's `net` column across all pages, and equals the sum of the chart's points. Same assertion as `backend-plan.md §9.3`, but through the browser.
3. **The offline consult appears.** Mark a `pending_at_clinic` booking paid from the doctor's appointments page. Its gross moves out of "Awaiting collection" and into "Net earnings" **without a page refresh** (proves the invalidation in §4). Before the `markPaid` fix, it lands as ₹0 net — run this once against the old code to see the bug you're fixing.
4. **Admin approve actually approves.** Click ✓ on a pending doctor. The row leaves the queue, the "Pending verifications" tile decrements, and the doctor's `verification_status` is `approved` in the database. Then click ✗ on another and confirm the reason is persisted.
5. **Patient counts survive pagination.** Seed 30 bookings. The "Completed" tile shows the true total, not the first page's worth. (Simulate by capping the list endpoint's response.)
6. **Absent data renders as absent.** A doctor with no reviews shows `—` for rating, not `0`. A brand-new doctor shows `₹0` net, `—` average per consult, and an `EmptyState` chart — no `NaN`, no `₹NaN`, no flat zero line without explanation.
7. **Error ≠ zero.** Kill the backend. Every tile shows an error state with a retry. Not one of them shows `₹0`.
