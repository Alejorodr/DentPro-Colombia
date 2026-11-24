"use client";

import { forwardRef, useImperativeHandle } from "react";
import type { CSSProperties, MouseEventHandler } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";

type AnimatedToothIconProps = {
  className?: string;
  color?: string;
  duration?: number;
  size?: number;
  style?: CSSProperties;
  role?: string;
  "aria-hidden"?: boolean | "true" | "false";
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
};

type AnimatedToothIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

const TOOTH_PATH =
  "M8.6 3.4c1.35 0 2.1.7 3.4.7s2.05-.7 3.4-.7c2.35 0 4 1.9 4 4.52 0 1.8-.7 3.12-1.35 4.25-.72 1.25-1.04 2.5-1.25 3.95-.28 1.9-.78 4.48-2.35 4.48-1.02 0-1.25-1.2-1.6-2.86-.24-1.13-.48-2.35-.85-2.35s-.61 1.22-.85 2.35c-.35 1.66-.58 2.86-1.6 2.86-1.57 0-2.07-2.58-2.35-4.48-.21-1.45-.53-2.7-1.25-3.95C5.3 11.04 4.6 9.72 4.6 7.92c0-2.62 1.65-4.52 4-4.52Z";
const SHINE_PATH = "M9.3 6.6c.77.38 1.62.58 2.7.58s1.93-.2 2.7-.58";

/**
 * Diente con animación propia, con la misma API que los iconos de AnimateIcons
 * (startAnimation/stopAnimation por ref), porque ninguna colección trae un diente.
 * Se mece como un diente sano que "brilla": balanceo corto y el brillo se redibuja.
 */
export const AnimatedToothIcon = forwardRef<AnimatedToothIconHandle, AnimatedToothIconProps>(
  ({ className, color, duration = 1, size = 24, style, onMouseEnter, onMouseLeave, ...rest }, ref) => {
    const toothControls = useAnimationControls();
    const shineControls = useAnimationControls();
    const prefersReducedMotion = useReducedMotion();

    useImperativeHandle(ref, () => ({
      startAnimation: () => {
        if (prefersReducedMotion) return;
        void toothControls.start("animate");
        void shineControls.start("animate");
      },
      stopAnimation: () => {
        void toothControls.start("normal");
        void shineControls.start("normal");
      },
    }));

    return (
      <div
        {...rest}
        className={["relative inline-flex", className].filter(Boolean).join(" ")}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ color, ...style }}
      >
        <motion.svg
          animate={toothControls}
          fill="none"
          height={size}
          initial="normal"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          style={{ transformOrigin: "50% 85%" }}
          variants={{
            normal: { rotate: 0, y: 0, scale: 1 },
            animate: {
              rotate: [0, -10, 8, -5, 2, 0],
              y: [0, -1.5, 0, -0.5, 0],
              scale: [1, 1.06, 1],
              transition: { duration: 0.9 * duration, ease: "easeInOut" },
            },
          }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={TOOTH_PATH} />
          <motion.path
            animate={shineControls}
            d={SHINE_PATH}
            initial="normal"
            variants={{
              normal: { pathLength: 1, opacity: 1 },
              animate: {
                pathLength: [0, 1],
                opacity: [0, 1],
                transition: { duration: 0.6 * duration, delay: 0.2 * duration, ease: "easeOut" },
              },
            }}
          />
        </motion.svg>
      </div>
    );
  },
);

AnimatedToothIcon.displayName = "AnimatedToothIcon";
