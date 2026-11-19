"use client";

import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FiBell } from "react-icons/fi";
import { API_ENDPOINTS } from "@/constants/api";
import { api } from "@/services/api";

interface DoctorNotification {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/** Shared prefix: marking read invalidates both the badge and the list. */
const KEY = ["doctor", "notifications"] as const;
const UNREAD_KEY = [...KEY, "unread-count"] as const;
const LIST_KEY = [...KEY, "latest"] as const;

async function fetchUnread(): Promise<number> {
  const { data } = await api.get<{ data: { unreadCount: number } }>(API_ENDPOINTS.notifications.unreadCount);
  return Number(data.data?.unreadCount ?? 0);
}

async function fetchLatest(): Promise<DoctorNotification[]> {
  const { data } = await api.get<{ data: { notifications: DoctorNotification[] } }>(API_ENDPOINTS.notifications.list, {
    params: { limit: 8, page: 1 },
  });
  return data.data?.notifications ?? [];
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Top-bar bell with the real unread count from the shared notification feed
 * (doctors receive appointment and record-access events there). The doctor
 * site has no notifications page, so the bell opens a short dropdown of the
 * latest items instead. No badge at zero or on a failed fetch.
 */
export function NotificationBell() {
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const unread = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: fetchUnread,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
  const latest = useQuery({ queryKey: LIST_KEY, queryFn: fetchLatest, enabled: !!anchor, staleTime: 15_000 });

  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  const markOne = useMutation({
    mutationFn: (id: number) => api.put(API_ENDPOINTS.notifications.markRead(id)),
    onSettled: refresh,
  });
  const markAll = useMutation({
    mutationFn: () => api.put(API_ENDPOINTS.notifications.markAllRead),
    onSettled: refresh,
  });

  const count = unread.data ?? 0;
  const label = count > 0 ? `Notifications, ${count} unread` : "Notifications";
  const items = latest.data ?? [];

  return (
    <>
      <Tooltip title={label}>
        <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={label} sx={{ color: "text.primary" }}>
          <Badge
            badgeContent={count}
            color="error"
            max={99}
            invisible={count === 0}
            sx={{ "& .MuiBadge-badge": { fontSize: 10, height: 16, minWidth: 16, px: 0.5 } }}
          >
            <FiBell size={19} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 340, maxWidth: "calc(100vw - 24px)", mt: 1 } } }}
      >
        <Stack direction="row" sx={{ px: 1.5, py: 1, alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
          <Button size="small" disabled={count === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
            Mark all read
          </Button>
        </Stack>
        <Divider />
        <Box sx={{ maxHeight: 380, overflowY: "auto" }}>
          {latest.isLoading ? (
            <Stack spacing={1} sx={{ p: 1.5 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={44} />
              ))}
            </Stack>
          ) : latest.isError ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              Couldn&apos;t load notifications.
            </Typography>
          ) : !items.length ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              You&apos;re all caught up.
            </Typography>
          ) : (
            items.map((n) => (
              <Box
                key={n.id}
                component="button"
                type="button"
                onClick={() => !n.isRead && markOne.mutate(n.id)}
                sx={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: 0,
                  borderBottom: 1,
                  borderColor: "divider",
                  px: 1.5,
                  py: 1,
                  font: "inherit",
                  color: "inherit",
                  cursor: n.isRead ? "default" : "pointer",
                  bgcolor: n.isRead ? "transparent" : "action.hover",
                  "&:hover": { bgcolor: "action.selected" },
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
                  {!n.isRead && <Box sx={{ mt: 0.75, width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: n.isRead ? 500 : 700, lineHeight: 1.3 }}>
                      {n.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.35 }}>
                      {n.message}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {when(n.createdAt)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            ))
          )}
        </Box>
      </Popover>
    </>
  );
}
