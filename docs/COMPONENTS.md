# Components, Theme and UI Conventions

## 1. Shared components (`src/components`)

| Folder | Component | Purpose |
|---|---|---|
| `feedback/` | `Loading` (also `fullScreen`, `label`), `EmptyState` (icon, title, description, action), `ErrorState` (retry), `OfflineBanner`, `Skeletons` | loading / empty / error / offline surfaces |
| `forms/` | `FormContainer`, `RHFTextField` | React Hook Form context + native form; MUI TextField bound via `Controller`, shows Zod error as helper text |
| `dialogs/` | `ConfirmDialog` | the reusable "are you sure?" primitive |
| `common/` | `Logo` (official logo on a white badge; `compact`, `onDark`), `PageContainer` (width + rhythm + optional header), `Icon` (resolve a Feather icon from a string name), `AccentTile` / `NavIcon` (meaning-based accent per icon: navy actions, green success/money, red critical, orange pending/follow-up, purple clinical records, teal vitals/diagnostics, amber notifications, grey neutral), `CustomCursor` (desktop-only dot + ring, only for fine hovering pointers >= 900 px, `pointer-events: none`) | |
| `ui/` | `DoctorAvatar`, `DoctorsMap` / `DoctorsMapInner`, `LocationSelect`, `Pagination`, `RatingStat`, `SearchBar`, `TagChip`, `VerifiedBadge`, `Breadcrumbs` | mostly used by the legacy public pages; `DoctorsMapInner` shows a "map unavailable" placeholder when no Maps key |
| `cards/`, `illustrations/`, `navigation/` (Navbar, Footer), `typography/` | | legacy public-site pieces used by `MainLayout` |

Barrels: `components/index.ts` and one `index.ts` per folder.

## 2. Feature components worth reusing

| Component | Location | Notes |
|---|---|---|
| `DashboardShell` | `features/dashboard/components` | responsive sidebar/appbar shell, embed mode |
| `KpiCard`, `KpiGrid`, `KpiSection`, `ChartCard`, `InfoTip` | `features/analytics/components` | loading/error local to a section; info tooltips from `definitions.ts` |
| `SeriesChart`, `DonutChart`, `Sparkline`, `ChartLegend` | `features/analytics/components/charts.tsx` | Recharts; legend text uses text tokens, swatch carries the series colour; colours in `chartColors.ts` |
| `TableCard`, `TableFooter`, `TableStatus`, `FilterSelect`, `StatusChip` | `analytics/components/explore` | explore-page tables |
| `RepeatableSection`, `SectionRow`, `useEditableSection` | `features/doctor/components` | generic add/edit/remove list UI for portfolio sections |
| `DocumentDropzone`, `PhotoUpload`, `ShowcaseImageUpload`, `HeroImagesUpload` | `features/doctor/components` | react-dropzone with size/type checks |
| `FollowUpChip` | `features/follow-ups/components` | one definition of the follow-up chip everywhere |
| `ImageViewer` | `features/appointments/components` | pan/zoom (wheel, buttons, pointer drag) viewer reused by `RecordSheet` |
| `RecordReader`, `RecordSheet` | `features/records` | continuous scroll through records; sheets render content only near the viewport |
| `HealthRecordTable`, `VitalValueCell`, `VITAL_LEGEND` (`vitalStatus.tsx`) | `features/appointments` | vitals matrix and coloured values with arrows and legend |
| `HistoryViews` | `features/emr/components` | structured clinical history; identical copy in `frontend-patient` |

## 3. Theme (`src/theme`)

* Built once by `createAppTheme()` and provided by `AppThemeProvider` (`CssBaseline enableColorScheme` + global styles). Light mode by default (`InitColorSchemeScript defaultMode="light"`); no theme toggle UI was found.
* Files: `palette.ts`, `typography.ts`, `components.ts` (MUI overrides), `shape.ts`, `shadows.ts`, `spacing.ts`, `transitions.ts`, `motion.ts`, `zIndex.ts`, `breakpoints.ts`, `styles.ts` (global + helpers), `types/mui.d.ts` (augments the theme with `theme.tokens`: `radius`, `duration`, surface tints, ...).
* **Colour language** (header of `palette.ts`): white page and cards separated by neutral borders; neutral greys (#F5F6F7 / #F0F1F2) for table/section headers; **deep navy primary** `navy[600] = #102B5C` (hover `#0A1F45`) for primary actions, active nav, selected controls; green `#198754` success/money; orange `#E68A19` pending/warning; red `#DC3545` danger; text near-black `#202733`. The same palette is described as shared by every IHS web app; this is the doctor app's copy.
* Shape: base radius 8; a numeric `sx` radius multiplies it (1.5 = 12 px, 2 = 16 px is the maximum for a normal card).
* Sidebar surface constants in `palette.ts`: `SIDEBAR_BG = #075B4C` (deep medical green, "IHS 2026-11 redesign"), `SIDEBAR_ACTIVE_BG = #FFFFFF`, `SIDEBAR_ACTIVE_TEXT = #075B4C`; `sidebarSurfaceSx` recolours list items, icons, avatar and dividers (white text idle, white pill with green text when active). Note `DashboardShell` still carries a stale comment/styles describing a white sidebar with a primary-tint active item; the `&&`-specificity rules in `sidebarSurfaceSx` win at render time (source-based inference, not visually verified).
* Typography: `Plus Jakarta Sans` (`--font-plus-jakarta-sans`); headings h1 2.25rem ... with negative letter-spacing.
* Breakpoints equal the MUI defaults (xs 0, sm 600, md 900, lg 1200, xl 1536).

## 4. Responsive behaviour

| Area | Behaviour |
|---|---|
| Shell | `< md`: temporary drawer + menu button; `>= md`: 76 px rail expanding to 264 px on hover/focus or when pinned |
| Auth layout | brand panel hidden `< md`; logo shown above the form instead |
| Page padding | `p: { xs: 1.5, sm: 2, md: 2.5 }` |
| Tables | stack into cards on phones in several lists (e.g. medicines); explore tables scroll |
| Uploads | longer timeout and client-side image compression for mobile uplinks |

## 5. Icons

`react-icons/fi` (Feather) everywhere; navigation items reference icon names by string and resolve them through `Icon` / `NavIcon`. `@mui/icons-material` is installed but secondary.

## 6. Accessibility practices seen in code

`aria-label`s on icon-only buttons; sidebar items get an explicit `aria-label` when collapsed; expansion only on `:focus-visible`; vitals bands carry an arrow glyph and range tooltip; follow-up colour always accompanied by text; MotionConfig honours reduced motion; disabled finalize button wrapped so its tooltip can explain why.
