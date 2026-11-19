# Tech Stack and Dependencies

Versions are taken from `package.json` (ranges) and the installed `node_modules` (resolved) at documentation time.

## 1. Core platform

| Item | Version | Role |
|---|---|---|
| Next.js | 16.2.9 (exact) | App Router, edge `proxy.ts`, standalone output, Turbopack dev |
| React / React DOM | 19.2.4 (exact) | UI; React Compiler enabled (`reactCompiler: true`, `babel-plugin-react-compiler` 1.0.0) |
| TypeScript | ^5 | `strict: true`, `moduleResolution: bundler`, alias `@/*` |
| Node | 20 (CI uses the `node20` tool) | build/runtime |
| Package manager | npm (`package-lock.json`); `pnpm-lock.yaml` is deleted in the working tree | Jenkins runs `npm ci` |
| ESLint | ^9 + `eslint-config-next` 16.2.9 | `npm run lint` |

## 2. Runtime dependencies by purpose

### UI and styling
| Package | Role |
|---|---|
| `@mui/material` ^9.1.2 (9.1.2) | Component library and theme (the whole UI) |
| `@mui/icons-material` ^9.1.1 | MUI icons (secondary; most icons are `react-icons`) |
| `@mui/lab` 9.0.0-beta.5 | Lab components |
| `@mui/x-data-grid`, `@mui/x-date-pickers`, `@mui/x-tree-view` ^9.7.0 | Grid, date pickers, tree view |
| `@emotion/react`, `@emotion/styled` | MUI styling engine |
| `react-icons` ^5.7.0 | Feather (`Fi*`) icon set used app-wide |
| `framer-motion` ^12.42.2 | Route fade, motion; `MotionConfig reducedMotion="user"` |
| `next-themes` ^0.4.6 | present in deps; theme is MUI-driven (not verified in use) |
| `class-variance-authority`, `clsx`, `tailwind-merge` | utility helpers present in deps; no Tailwind config in this app (usage not verified) |
| `react-loading-skeleton` | present in deps (MUI `Skeleton` is what the viewed code uses) |

### Data and forms
| Package | Role |
|---|---|
| `axios` ^1.18.1 | HTTP client with interceptors |
| `@tanstack/react-query` ^5.101.2 (+ devtools) | Server-state cache; devtools only when `NODE_ENV === "development"` |
| `@tanstack/react-table` ^8.21.3 | present in deps (usage not verified in the files read) |
| `react-hook-form` ^7.80.0 + `@hookform/resolvers` ^5.4.0 | Forms |
| `zod` ^4.4.3 | Validation (forms and env) |
| `js-cookie` ^3.0.8 | Token cookies |
| `jwt-decode` ^4.0.0 | Decode token claims (`utils/jwt.ts`) |
| `date-fns` ^4.4.0, `dayjs` ^1.11.21 | Dates |
| `copy-to-clipboard` | clipboard helper |

### Domain libraries
| Package | Role |
|---|---|
| `livekit-client` ^2.21.0, `@livekit/components-react` ^2.9.23, `@livekit/components-styles` | Video consultation (`VideoConference`) |
| `@vis.gl/react-google-maps` ^1.9.0 | Clinic-location picker, location autocomplete, doctor map |
| `leaflet`, `react-leaflet`, `@types/leaflet` | present (legacy/older map code; not verified in current doctor flows) |
| `@react-oauth/google` ^0.13.5 | Google Identity button |
| `recharts` ^3.9.1 | Analytics charts, earnings area chart |
| `react-pdf` ^10.4.1 | present; the prescription PDF preview itself uses an `<iframe>` on a blob URL (see `RxPdfPreviewDialog`) |
| `react-dropzone` ^15.0.0 | Photo / document / QR uploads |
| `react-qr-code` | QR rendering |
| `react-markdown`, `remark-gfm`, `rehype-highlight` | markdown rendering (usage not verified) |
| `sonner` ^2.0.7 | Toasts |
| `yet-another-react-lightbox` | Image lightbox |
| `react-intersection-observer` | Visibility detection (record reader lazy-render) |

### Dev dependencies
`@types/node` ^20, `@types/react` ^19, `@types/react-dom` ^19, `@types/js-cookie`, `typescript` ^5, `eslint` ^9, `eslint-config-next` 16.2.9, `babel-plugin-react-compiler` 1.0.0.

> "usage not verified" means the dependency is declared but the files read for this documentation did not show an import; a dependency audit (`depcheck`) is recommended before pruning.

## 3. Fonts

* `Plus_Jakarta_Sans` (weights 400-800) from `next/font/google` in the root layout, exposed as `--font-plus-jakarta-sans`.
* The patient-description page loads `Newsreader`, `Public_Sans` and `Spline_Sans_Mono` locally to that route only (so other pages do not preload them).

## 4. Browser/runtime requirements

* Modern evergreen browser (canvas, `createImageBitmap`, `useSyncExternalStore`, WebRTC for video).
* Cookies must be allowed; storage use is minimal (`localStorage` key `ihs.doctor.sidebarPinned`).
