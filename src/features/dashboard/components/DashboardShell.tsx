"use client";

import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { FiChevronsLeft, FiChevronsRight, FiHome, FiLogOut, FiMenu, FiSettings, FiUser } from "react-icons/fi";
import { NavIcon } from "@/components/common/AccentTile";
import { Loading } from "@/components/feedback/Loading";
import { Logo } from "@/components/common/Logo";
import { SIDEBAR_BG, sidebarSurfaceSx } from "@/theme/palette";
import { ROUTES } from "@/constants/routes";
import { env } from "@/config/env";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/utils/format";
import { formatPersonName } from "@/utils/display";
import { useOnboarding, useOwnProfile } from "@/features/doctor/hooks";
import { dashboardNavForRole, visibleNav, roleLabel } from "../nav";
import { NotificationBell } from "./NotificationBell";

const DRAWER_WIDTH = 264;
/**
 * Collapsed ("mini") sidebar — icons only. On desktop the sidebar sits at this
 * width and expands to DRAWER_WIDTH on hover, overlaying the page instead of
 * pushing it, so the working area keeps a constant width and never reflows.
 */
const RAIL_WIDTH = 76;
/** Remembers the pinned (always-expanded) preference across visits. */
const PIN_KEY = "ihs.doctor.sidebarPinned";
/**
 * The dashboard sidebar is a white surface (IHS SaaS refresh, 2026-11): slate
 * labels, and the active item on a light-blue tint in the primary blue.
 */

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, isLoading, isReconnecting, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  /**
   * `?embed=1` strips the sidebar and top bar.
   *
   * The video-call page shows History / Description / Prescription in a
   * same-origin iframe beside a picture-in-picture call. Without this the
   * iframe renders a SECOND full dashboard inside the panel — its own sidebar,
   * its own app bar — which is both absurd and unusable at panel width.
   *
   * Auth is deliberately still enforced below: embedding changes the chrome,
   * never the gate.
   */
  const embedParam = useSearchParams()?.get("embed") === "1";
  /**
   * Being in an iframe is the reliable signal, not the query param.
   *
   * The param only survives the FIRST load: clicking "Write prescription"
   * inside the panel navigates the iframe to a URL without it, and the whole
   * dashboard chrome reappears nested inside the panel. Checking the frame
   * itself covers every internal navigation with no params to thread through.
   *
   * Safe to read `window` here: the auth bootstrap above returns <Loading />
   * on the server and on the hydration pass, so this branch is only ever
   * evaluated client-side.
   */
  const embedded = embedParam || (typeof window !== "undefined" && window.self !== window.top);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  // Desktop sidebar: collapsed to a rail, expanded while the pointer is over it
  // (or while it holds keyboard focus), or permanently when pinned.
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  // No hydration mismatch: auth starts in its loading state, so both the server
  // render and the hydration pass return <Loading /> rather than the sidebar.
  const [pinned, setPinned] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(PIN_KEY) === "1",
  );
  // Live = verification approved. Gates operational nav items (bookings/earnings)
  // until the doctor's profile is public.
  const { data: onboarding } = useOnboarding();
  const isLive = onboarding?.verificationStatus === "approved";
  // Name, photo and specialty for the top bar (cached; the overview reads it too).
  const { data: profile } = useOwnProfile();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace(ROUTES.auth.login);
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !user) {
    return (
      <Loading
        fullScreen
        label={isReconnecting ? "The server is busy — reconnecting, you're still signed in…" : "Loading your dashboard…"}
      />
    );
  }

  // Embedded: the page content only. The parent window already provides
  // navigation, and a nested sidebar would just steal panel width.
  if (embedded) {
    return (
      <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", p: { xs: 1.5, md: 2.5 } }}>
        {children}
      </Box>
    );
  }

  const nav = visibleNav(dashboardNavForRole(user.role), isLive);
  const active = (href: string) => (href === ROUTES.dashboard.root ? pathname === href : pathname.startsWith(href));
  const pageTitle = nav.find((n) => active(n.href))?.label ?? "Dashboard";
  const specialty = (profile?.specializations ?? []).map((sp) => sp.name).join(", ") || profile?.qualification || "";

  /** Is the desktop sidebar currently showing labels? */
  const expanded = pinned || hovered || focusWithin;
  /**
   * Space the sidebar reserves in the layout. Pinned it docks at full width;
   * unpinned it keeps the rail's footprint and the hover expansion floats over
   * the page, so hovering never shifts the content underneath.
   */
  const railWidth = pinned ? DRAWER_WIDTH : RAIL_WIDTH;

  const togglePinned = () =>
    setPinned((prev) => {
      window.localStorage.setItem(PIN_KEY, prev ? "0" : "1");
      return !prev;
    });

  /** `open` = labels visible. The mobile drawer always passes true. */
  const renderNav = (open: boolean) => (
    <Stack
      sx={{
        height: "100%",
        ...sidebarSurfaceSx,
        overflowX: "hidden",
        "& .MuiDivider-root": { borderColor: "divider" },
      }}
    >
      <Toolbar sx={{ px: open ? 2.5 : 0, justifyContent: open ? "flex-start" : "center" }}>
        <Logo compact={!open} />
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 1.5, flexGrow: 1 }} onClick={() => setMobileOpen(false)}>
        {nav.map((item) => {
          const isActive = active(item.href);
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={isActive}
              // Collapsed the label is invisible, so name the button explicitly
              // and let the browser tooltip cover a pointer that never expands
              // the rail (touch, reduced-hover devices).
              aria-label={item.label}
              title={open ? undefined : item.label}
              sx={{
                borderRadius: (t) => `${t.tokens.radius.md}px`,
                mb: 0.5,
                minHeight: 44,
                px: open ? 2 : 0,
                justifyContent: "center",
                color: isActive ? "primary.main" : "text.secondary",
                "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                "&.Mui-selected": { bgcolor: (t) => alpha(t.palette.primary.main, 0.08), color: "primary.main" },
                "&.Mui-selected:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.12) },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 0, justifyContent: "center", color: "inherit" }}>
                <NavIcon name={item.icon} size={19} />
              </ListItemIcon>
              {/* Stays mounted so the label is revealed by the width animation;
                  a zero flex-basis when collapsed keeps the icon centred. */}
              <ListItemText
                primary={item.label}
                sx={{
                  m: 0,
                  minWidth: 0,
                  // Collapsed it must not grow either, or it would swallow the
                  // free space and shove the icon off-centre.
                  flexGrow: open ? 1 : 0,
                  flexBasis: open ? "auto" : 0,
                  opacity: open ? 1 : 0,
                  whiteSpace: "nowrap",
                  transition: (t) => t.transitions.create("opacity", { duration: t.transitions.duration.shortest }),
                }}
                slotProps={{ primary: { sx: { fontWeight: isActive ? 700 : 500, fontSize: 14 } } }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <Stack direction="row" sx={{ p: open ? 2 : 1.5, gap: open ? 1.5 : 0, alignItems: "center", justifyContent: open ? "flex-start" : "center" }}>
        <Avatar src={user.avatarUrl ?? undefined} sx={{ bgcolor: "primary.main", color: "primary.contrastText", width: 38, height: 38, fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
          {getInitials(user.name)}
        </Avatar>
        <Box
          sx={{
            minWidth: 0,
            flexBasis: open ? "auto" : 0,
            opacity: open ? 1 : 0,
            transition: (t) => t.transitions.create("opacity", { duration: t.transitions.duration.shortest }),
          }}
        >
          <Typography variant="subtitle2" noWrap>{formatPersonName(user.name)}</Typography>
          <Typography variant="caption" noWrap sx={{ color: "text.secondary" }}>{roleLabel[user.role]}</Typography>
        </Box>
      </Stack>
    </Stack>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "background.default" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${railWidth}px)` },
          ml: { md: `${railWidth}px` },
          transition: (t) => t.transitions.create(["width", "margin"], { easing: t.transitions.easing.sharp, duration: t.transitions.duration.enteringScreen }),
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
          color: "text.primary",
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: "none" }, color: "text.primary" }} aria-label="Open menu">
            <FiMenu />
          </IconButton>
          {/* Pin the sidebar open. Also the only way to read the labels on a
              device with no hover, where the rail never expands on its own. */}
          <IconButton
            onClick={togglePinned}
            sx={{ display: { xs: "none", md: "inline-flex" }, color: "text.primary" }}
            aria-label={pinned ? "Collapse sidebar" : "Keep sidebar expanded"}
            aria-pressed={pinned}
          >
            {pinned ? <FiChevronsLeft /> : <FiChevronsRight />}
          </IconButton>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, flexGrow: 1, minWidth: 0, fontSize: { xs: 16, sm: 18 } }}>
            {pageTitle}
          </Typography>
          {/* Cross-app link: the public IHS site (patient app) is a separate
              deployment on the main domain, so a plain anchor, not next/link. */}
          <Tooltip title="IHS home page">
            <IconButton component="a" href={env.patientUrl} aria-label="Go to IHS home page" sx={{ color: "text.primary" }}>
              <FiHome size={19} />
            </IconButton>
          </Tooltip>
          <NotificationBell />
          <Tooltip title="Account">
            <Box
              component="button"
              type="button"
              onClick={(e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
              aria-label="Account"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                ml: 0.5,
                p: 0.5,
                pr: { xs: 0.5, md: 1.25 },
                border: 0,
                borderRadius: 999,
                bgcolor: "transparent",
                color: "inherit",
                font: "inherit",
                cursor: "pointer",
                textAlign: "left",
                transition: (t) => t.transitions.create("background-color", { duration: 150 }),
                "&:hover": { bgcolor: "action.hover" },
                "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
              }}
            >
              <Avatar src={profile?.photoUrl ?? user.avatarUrl ?? undefined} sx={{ bgcolor: "primary.main", color: "primary.contrastText", width: 34, height: 34, fontSize: 13, fontWeight: 700 }}>
                {getInitials(user.name)}
              </Avatar>
              <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0, maxWidth: 200 }}>
                <Typography variant="subtitle2" noWrap sx={{ lineHeight: 1.2 }}>
                  {formatPersonName(profile?.name ?? user.name)}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="p" sx={{ lineHeight: 1.2 }}>
                  {specialty || roleLabel[user.role]}
                </Typography>
              </Box>
            </Box>
          </Tooltip>
          <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" noWrap>{formatPersonName(user.name)}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{user.email}</Typography>
            </Box>
            <Divider />
            {/* Cross-app link — the patient app is a separate deployment (main domain), so a plain anchor is used instead of next/link. */}
            <MenuItem component={Link} href={ROUTES.dashboard.portfolio} onClick={() => setAnchorEl(null)}>
              <ListItemIcon><FiUser /></ListItemIcon>
              My portfolio
            </MenuItem>
            <MenuItem component={Link} href={ROUTES.dashboard.settings} onClick={() => setAnchorEl(null)}>
              <ListItemIcon><FiSettings /></ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem component="a" href={env.patientUrl} onClick={() => setAnchorEl(null)}>
              <ListItemIcon><FiHome /></ListItemIcon>
              IHS home page
            </MenuItem>
            <MenuItem onClick={() => { setAnchorEl(null); void logout(); }}>
              <ListItemIcon><FiLogOut /></ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: railWidth }, flexShrink: { md: 0 }, transition: (t) => t.transitions.create("width", { easing: t.transitions.easing.sharp, duration: t.transitions.duration.enteringScreen }) }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box", borderRadius: 0, bgcolor: SIDEBAR_BG, borderColor: SIDEBAR_BG } }}>
          {renderNav(true)}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          // Keyboard equivalent of hover. `relatedTarget` is the element taking
          // focus, so tabbing between nav items doesn't flicker the rail shut.
          //
          // Only :focus-visible counts: clicking a nav item also focuses it,
          // and treating that as "keep open" left the rail stuck open after the
          // pointer had already moved away.
          onFocus={(e) => setFocusWithin(e.target.matches(":focus-visible"))}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
          }}
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: expanded ? DRAWER_WIDTH : RAIL_WIDTH,
              overflowX: "hidden",
              boxShadow: expanded && !pinned ? 8 : "none",
              transition: (t) => t.transitions.create(["width", "box-shadow"], { easing: t.transitions.easing.sharp, duration: t.transitions.duration.enteringScreen }),
              boxSizing: "border-box",
              borderRadius: 0,
              bgcolor: SIDEBAR_BG,
              borderColor: SIDEBAR_BG,
            },
          }}
        >
          {renderNav(expanded)}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${railWidth}px)` } }}>
        <Toolbar aria-hidden />
        {/* Same compact gutter as the patient dashboard. */}
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 2.5 } }}>{children}</Box>
      </Box>
    </Box>
  );
}
