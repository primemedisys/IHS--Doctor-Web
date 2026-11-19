"use client";

import type { IconBaseProps } from "react-icons";
import * as FiIcons from "react-icons/fi";

/**
 * Resolves a react-icons (Feather) component from its string name so config
 * (e.g. navigation) can stay serializable and free of component imports.
 * Falls back to a neutral glyph if the name is unknown.
 */
export interface IconProps extends IconBaseProps {
  name: string;
}

const registry = FiIcons as unknown as Record<string, React.ComponentType<IconBaseProps>>;

export function Icon({ name, ...props }: IconProps) {
  const Glyph = registry[name] ?? FiIcons.FiCircle;
  return <Glyph aria-hidden {...props} />;
}
