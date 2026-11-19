import Avatar from "@mui/material/Avatar";
import type { SxProps, Theme } from "@mui/material/styles";
import { getInitials } from "@/utils/format";

export interface DoctorAvatarProps {
  name: string;
  src?: string;
  size?: number;
  sx?: SxProps<Theme>;
}

/** Avatar with graceful initials fallback (dummy data has no photos). */
export function DoctorAvatar({ name, src, size = 48, sx }: DoctorAvatarProps) {
  return (
    <Avatar
      src={src}
      alt={name}
      sx={{ width: size, height: size, bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 700, fontSize: size / 2.5, ...sx }}
    >
      {getInitials(name.replace(/^Dr\.?\s*/i, ""))}
    </Avatar>
  );
}
