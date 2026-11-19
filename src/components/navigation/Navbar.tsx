"use client";

import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
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
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import useScrollTrigger from "@mui/material/useScrollTrigger";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FiLogOut, FiMenu, FiUser, FiX } from "react-icons/fi";
import { Logo } from "@/components/common/Logo";import { mainNav } from "@/config/site";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/utils/format";
import { formatPersonName } from "@/utils/display";

export interface NavbarProps {
  /** Overlay the hero transparently until the user scrolls (used on Home). */
  transparentOnTop?: boolean;
}

/**
 * Sticky public navbar with a pill-style nav, an animated active indicator, and
 * a frosted-glass surface that fades in on scroll. Collapses to a drawer on mobile.
 */
export function Navbar({ transparentOnTop = false }: NavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 8 });
  const solid = !transparentOnTop || scrolled;

  const isActive = (href: string) => (href === ROUTES.home ? pathname === href : pathname.startsWith(href));

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: solid ? "background.paper" : "transparent",
        borderBottom: 1,
        borderColor: solid ? "divider" : "transparent",
        boxShadow: "none",
        transition: (t) => t.transitions.create(["background-color", "border-color", "box-shadow"]),
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: (t) => t.tokens.layout.navbarHeight, gap: 2 }}>
          <Logo />

          {/* Desktop nav — pill group */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              display: { xs: "none", md: "flex" },
              mx: "auto",
              p: 0.5,
              borderRadius: (t) => `${t.tokens.radius.pill}px`,
              bgcolor: "grey.50",
              border: 1,
              borderColor: "divider",
            }}
          >
            {mainNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Button
                  key={item.href}
                  component={Link}
                  href={item.href}
                  disableRipple
                  sx={{
                    px: 2,
                    borderRadius: (t) => `${t.tokens.radius.pill}px`,
                    color: active ? "primary.main" : "text.secondary",
                    fontWeight: active ? 700 : 500,
                    bgcolor: (t) => (active ? alpha(t.palette.primary.main, 0.12) : "transparent"),
                    "&:hover": {
                      bgcolor: (t) => (active ? alpha(t.palette.primary.main, 0.16) : t.palette.grey[100]),
                      color: active ? "primary.main" : "text.primary",
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>

          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />

          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>            {isAuthenticated && user ? (
              <UserMenu name={formatPersonName(user.name)} email={user.email} avatarUrl={user.avatarUrl} onLogout={() => void logout()} />
            ) : (
              <>
                <Button
                  component={Link}
                  href={ROUTES.auth.login}
                  color="inherit"
                  sx={{ display: { xs: "none", sm: "inline-flex" }, color: "text.secondary", fontWeight: 600 }}
                >
                  Sign In
                </Button>
                <Button
                  component={Link}
                  href={ROUTES.auth.register}
                  variant="contained"
                  sx={{ display: { xs: "none", sm: "inline-flex" }, borderRadius: (t) => `${t.tokens.radius.pill}px`, px: 2.5 }}
                >
                  Get started
                </Button>
              </>
            )}
            <IconButton
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              sx={{ display: { md: "none" }, color: "text.primary" }}
            >
              <FiMenu />
            </IconButton>
          </Stack>
        </Toolbar>
      </Container>

      {/* Mobile drawer */}
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} slotProps={{ paper: { sx: { width: 288 } } }}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", p: 2 }}>
          <Logo />
          <IconButton aria-label="Close menu" onClick={() => setOpen(false)}>
            <FiX />
          </IconButton>
        </Stack>
        <Divider />
        <List sx={{ px: 1, py: 1.5 }} onClick={() => setOpen(false)}>
          {mainNav.map((item) => {
            const active = isActive(item.href);
            return (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                selected={active}
                sx={{
                  borderRadius: (t) => `${t.tokens.radius.md}px`,
                  mb: 0.5,
                  "&.Mui-selected": { bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: "primary.main" },
                }}
              >
                <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: active ? 700 : 500 } } }} />
              </ListItemButton>
            );
          })}
        </List>
        <Divider />
        <Stack spacing={1} sx={{ p: 2 }}>
          {isAuthenticated && user ? (
            <>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                <Avatar src={user.avatarUrl ?? undefined} sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: 14 }}>{getInitials(user.name)}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap>{formatPersonName(user.name)}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{user.email}</Typography>
                </Box>
              </Stack>
              <Button variant="outlined" startIcon={<FiLogOut />} onClick={() => { setOpen(false); void logout(); }}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button component={Link} href={ROUTES.auth.login} variant="outlined" onClick={() => setOpen(false)}>
                Sign In
              </Button>
              <Button component={Link} href={ROUTES.auth.register} variant="contained" onClick={() => setOpen(false)}>
                Get started
              </Button>
            </>
          )}
        </Stack>
      </Drawer>
    </AppBar>
  );
}

function UserMenu({ name, email, avatarUrl, onLogout }: { name: string; email: string; avatarUrl?: string | null; onLogout: () => void }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Account menu" sx={{ p: 0.5 }}>
        <Avatar src={avatarUrl ?? undefined} sx={{ bgcolor: "primary.main", color: "primary.contrastText", width: 34, height: 34, fontSize: 14, fontWeight: 700 }}>
          {getInitials(name)}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" noWrap>{name}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{email}</Typography>
        </Box>
        <Divider />
        <MenuItem component={Link} href={ROUTES.dashboard.root} onClick={() => setAnchorEl(null)}>
          <ListItemIcon><FiUser /></ListItemIcon>
          My dashboard
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onLogout(); }}>
          <ListItemIcon><FiLogOut /></ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}
