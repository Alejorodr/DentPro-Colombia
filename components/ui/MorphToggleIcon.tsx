"use client";

import type { SVGProps } from "react";
import { Eye, EyeOff, Menu, Moon, Sun, X } from "lucide";
import { MorphIcon } from "morphicons/react";

/**
 * Pares de iconos que comparten lugar en la interfaz. Al cambiar de estado,
 * el trazo se transforma de un icono al otro en vez de saltar (Morphicons).
 * Respeta prefers-reduced-motion: con la preferencia activa, el cambio es instantáneo.
 */
const MORPH_PAIRS = {
  menu: { off: Menu, on: X },
  visibility: { off: Eye, on: EyeOff },
  theme: { off: Sun, on: Moon },
} as const;

type MorphToggleIconName = keyof typeof MORPH_PAIRS;

type MorphToggleIconProps = Omit<SVGProps<SVGSVGElement>, "ref" | "from" | "to"> & {
  name: MorphToggleIconName;
  /** `true` muestra el segundo icono del par (X, ojo tachado, luna). */
  active: boolean;
  size?: number | string;
  weight?: "bold" | "regular";
};

export function MorphToggleIcon({ name, active, size = 24, weight = "regular", ...props }: MorphToggleIconProps) {
  const pair = MORPH_PAIRS[name];

  return (
    <MorphIcon
      {...props}
      icon={active ? pair.on : pair.off}
      reducedMotion="user"
      size={size}
      spring="snappy"
      strokeWidth={weight === "bold" ? 2.25 : 2}
    />
  );
}
