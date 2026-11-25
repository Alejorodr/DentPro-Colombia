"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { RefObject } from "react";
import type { ComponentType, ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BellIcon,
  CalendarCheckIcon,
  CalendarIcon,
  CalendarPlusIcon,
  ChartLineIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  ClipboardIcon,
  ClockIcon,
  CircleAlertIcon,
  CircleXIcon,
  CreditCardIcon,
  DiamondIcon,
  EyeIcon,
  FacebookIcon,
  FileTextIcon,
  FilterIcon,
  FlaskConicalIcon,
  HeadsetIcon,
  HistoryIcon,
  HouseIcon,
  InstagramIcon,
  LayoutGridIcon,
  LinkedinIcon,
  LockIcon,
  LogOutIcon,
  MailIcon,
  MapPinIcon,
  MedalIcon,
  MenuIcon,
  MessageCircleMoreIcon,
  MicIcon,
  MoonIcon,
  MoonStarIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  SettingsIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  StarIcon,
  StethoscopeIcon,
  TrashIcon,
  TrendingUpIcon,
  UploadIcon,
  UserCheckIcon,
  UserMinusIcon,
  UserRoundIcon,
  UsersIcon,
  UsersRoundIcon,
  XIcon,
} from "@animateicons/react/lucide";
import { SmileIcon as HugeSmileIcon, TiktokIcon, WhatsappIcon } from "@animateicons/react/huge";
import { Baby as LucideBaby, Cookie as LucideCookie, Copyright as LucideCopyright, LoaderCircle } from "lucide-react";

import { AnimatedToothIcon } from "@/components/ui/AnimatedToothIcon";

import { cn } from "@/lib/utils";

type IconWeight = "bold" | "duotone" | "fill" | "light" | "regular" | "thin";

type IconProps = Omit<SVGProps<SVGSVGElement>, "color" | "ref"> & {
  color?: string;
  duration?: number;
  isAnimated?: boolean;
  mirrored?: boolean;
  size?: number | string;
  weight?: IconWeight;
};

type IconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

export type Icon = ForwardRefExoticComponent<IconProps & RefAttributes<IconHandle>>;

type AnimatedIconComponent = ComponentType<Record<string, unknown>>;

const DEFAULT_ICON_SIZE = 24;
const ICON_MOTION_REST = { scale: 1, y: 0, rotate: 0 };
const ICON_MOTION_TRANSITION = { duration: 0.42, ease: "easeOut" as const };
const ICON_MOTION_REST_TRANSITION = { duration: 0.16, ease: "easeOut" as const };

function resolveSize(size: IconProps["size"]) {
  return typeof size === "number" ? size : DEFAULT_ICON_SIZE;
}

function resolveStrokeWidth(weight?: IconWeight) {
  if (weight === "bold" || weight === "fill") return 2.25;
  if (weight === "light" || weight === "thin") return 1.75;
  return 2;
}

function useDentProIconMotion() {
  const controls = useAnimationControls();
  const prefersReducedMotion = useReducedMotion();

  const start = () => {
    if (prefersReducedMotion) return;
    void controls.start({
      scale: [1, 1.12, 1],
      y: [0, -1.5, 0],
      rotate: [0, -4, 4, 0],
      transition: ICON_MOTION_TRANSITION,
    });
  };

  const stop = () => {
    if (prefersReducedMotion) return;
    void controls.start({
      ...ICON_MOTION_REST,
      transition: ICON_MOTION_REST_TRANSITION,
    });
  };

  return { controls, start, stop };
}

/**
 * Elementos que disparan la animación del icono que contienen: al pasar el cursor
 * o al llegar con el teclado al botón, enlace o tarjeta, se anima su icono, no solo
 * cuando el cursor queda justo encima del icono. ".group" cubre las tarjetas que ya
 * usan group-hover, ".card" la tarjeta signature; "data-icon-trigger" sirve para marcar cualquier otro contenedor.
 */
const ICON_TRIGGER_SELECTOR = [
  "a[href]",
  "button",
  "summary",
  "label",
  '[role="button"]',
  '[role="menuitem"]',
  '[role="tab"]',
  "[data-icon-trigger]",
  ".card",
  ".group",
].join(",");

function useIconTrigger(
  anchorRef: RefObject<HTMLElement | null>,
  start: () => void,
  stop: () => void,
  enabled: boolean,
) {
  const handlers = useRef({ start, stop });

  useEffect(() => {
    handlers.current = { start, stop };
  });

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || !enabled) return;

    const trigger = anchor.parentElement?.closest<HTMLElement>(ICON_TRIGGER_SELECTOR) ?? anchor;
    const handleEnter = () => handlers.current.start();
    const handleLeave = () => handlers.current.stop();
    const handleFocusIn = () => {
      if (trigger.matches(":focus-visible") || trigger.querySelector(":focus-visible")) {
        handlers.current.start();
      }
    };

    trigger.addEventListener("pointerenter", handleEnter);
    trigger.addEventListener("pointerleave", handleLeave);
    trigger.addEventListener("focusin", handleFocusIn);
    trigger.addEventListener("focusout", handleLeave);

    return () => {
      trigger.removeEventListener("pointerenter", handleEnter);
      trigger.removeEventListener("pointerleave", handleLeave);
      trigger.removeEventListener("focusin", handleFocusIn);
      trigger.removeEventListener("focusout", handleLeave);
    };
  }, [anchorRef, enabled]);
}

/**
 * Icono con la animación propia de AnimateIcons (la campana se mece, el engranaje
 * gira, la flecha avanza...). La dispara el contenedor interactivo (useIconTrigger).
 * Con prefers-reduced-motion, AnimateIcons no anima.
 *
 * AnimateIcons envuelve el SVG en un <div>: no pongas estos iconos dentro de un <p>
 * (el navegador corta el párrafo y React falla al hidratar). Usa un <div> o un <span>.
 */
function createAnimatedIcon(AnimatedIcon: AnimatedIconComponent, displayName: string): Icon {
  const DentProAnimatedIcon = forwardRef<IconHandle, IconProps>(
    (
      {
        className,
        color,
        duration,
        isAnimated,
        mirrored,
        onMouseEnter,
        onMouseLeave,
        size,
        style,
        weight,
        ...svgProps
      },
      ref,
    ) => {
      const iconRef = useRef<IconHandle | null>(null);
      const anchorRef = useRef<HTMLSpanElement | null>(null);
      const start = () => iconRef.current?.startAnimation();
      const stop = () => iconRef.current?.stopAnimation();

      useIconTrigger(anchorRef, start, stop, isAnimated !== false);
      useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }));

      return (
        <span ref={anchorRef} className="inline-flex shrink-0 items-center justify-center align-middle">
          <AnimatedIcon
            ref={iconRef}
            aria-hidden={svgProps["aria-hidden"] as boolean | "true" | "false" | undefined}
            className={cn(
              "[&>svg]:h-full [&>svg]:w-full",
              (weight === "bold" || weight === "fill") && "[&_svg]:[stroke-width:2.25]",
              (weight === "light" || weight === "thin") && "[&_svg]:[stroke-width:1.75]",
              className,
            )}
            color={color}
            duration={duration}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            role={svgProps.role}
            size={resolveSize(size)}
            style={{
              transform: mirrored ? "scaleX(-1)" : undefined,
              ...style,
            }}
          />
        </span>
      );
    },
  );

  DentProAnimatedIcon.displayName = displayName;
  return DentProAnimatedIcon;
}

function createLucideIcon(LucideIcon: ComponentType<SVGProps<SVGSVGElement>>, displayName: string): Icon {
  const DentProLucideIcon = forwardRef<IconHandle, IconProps>(
    (
      {
        className,
        color,
        duration: _duration,
        isAnimated,
        mirrored,
        onMouseEnter,
        onMouseLeave,
        size,
        style,
        weight,
        ...props
      },
      ref,
    ) => {
      const triggerRef = useRef<HTMLSpanElement | null>(null);
      const motionApi = useDentProIconMotion();
      useIconTrigger(triggerRef, motionApi.start, motionApi.stop, isAnimated !== false);

      useImperativeHandle(ref, () => ({
        startAnimation: motionApi.start,
        stopAnimation: motionApi.stop,
      }));

      return (
        <motion.span
          ref={triggerRef}
          animate={motionApi.controls}
          className="inline-flex shrink-0 items-center justify-center align-middle"
          initial={false}
          style={{ transformOrigin: "center" }}
        >
          <LucideIcon
            {...props}
            aria-hidden={props["aria-hidden"]}
            className={className}
            color={color}
            height={size}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            strokeWidth={resolveStrokeWidth(weight)}
            style={{
              transform: mirrored ? "scaleX(-1)" : undefined,
              ...style,
            }}
            width={size}
          />
        </motion.span>
      );
    },
  );

  DentProLucideIcon.displayName = displayName;
  return DentProLucideIcon;
}

export const ArrowLeft = createAnimatedIcon(ArrowLeftIcon, "ArrowLeft");
export const ArrowRight = createAnimatedIcon(ArrowRightIcon, "ArrowRight");
export const ArrowDown = createAnimatedIcon(ArrowDownIcon, "ArrowDown");
export const ArrowUp = createAnimatedIcon(ArrowUpIcon, "ArrowUp");
export const Baby = createLucideIcon(LucideBaby, "Baby");
export const Bell = createAnimatedIcon(BellIcon, "Bell");
export const CalendarBlank = createAnimatedIcon(CalendarIcon, "CalendarBlank");
export const CalendarCheck = createAnimatedIcon(CalendarCheckIcon, "CalendarCheck");
export const CalendarPlus = createAnimatedIcon(CalendarPlusIcon, "CalendarPlus");
export const CaretLeft = createAnimatedIcon(ChevronLeftIcon, "CaretLeft");
export const CaretRight = createAnimatedIcon(ChevronRightIcon, "CaretRight");
export const ChartLineUp = createAnimatedIcon(ChartLineIcon, "ChartLineUp");
export const ChatCircleDots = createAnimatedIcon(MessageCircleMoreIcon, "ChatCircleDots");
export const CheckCircle = createAnimatedIcon(CircleCheckIcon, "CheckCircle");
export const CircleNotch = createLucideIcon(LoaderCircle, "CircleNotch");
export const ClipboardText = createAnimatedIcon(ClipboardIcon, "ClipboardText");
export const ClockCounterClockwise = createAnimatedIcon(HistoryIcon, "ClockCounterClockwise");
export const Clock = createAnimatedIcon(ClockIcon, "Clock");
export const Cookie = createLucideIcon(LucideCookie, "Cookie");
export const Copyright = createLucideIcon(LucideCopyright, "Copyright");
export const CreditCard = createAnimatedIcon(CreditCardIcon, "CreditCard");
export const DiamondsFour = createAnimatedIcon(DiamondIcon, "DiamondsFour");
export const EnvelopeSimple = createAnimatedIcon(MailIcon, "EnvelopeSimple");
export const DeviceMobile = createAnimatedIcon(SmartphoneIcon, "DeviceMobile");
export const Eye = createAnimatedIcon(EyeIcon, "Eye");
export const FacebookLogo = createAnimatedIcon(FacebookIcon, "FacebookLogo");
export const FileArrowUp = createAnimatedIcon(UploadIcon, "FileArrowUp");
export const FileText = createAnimatedIcon(FileTextIcon, "FileText");
export const Flask = createAnimatedIcon(FlaskConicalIcon, "Flask");
export const Funnel = createAnimatedIcon(FilterIcon, "Funnel");
export const Gear = createAnimatedIcon(SettingsIcon, "Gear");
export const Headset = createAnimatedIcon(HeadsetIcon, "Headset");
export const House = createAnimatedIcon(HouseIcon, "House");
export const InstagramLogo = createAnimatedIcon(InstagramIcon, "InstagramLogo");
export const LinkedinLogo = createAnimatedIcon(LinkedinIcon, "LinkedinLogo");
export const List = createAnimatedIcon(MenuIcon, "List");
export const Lock = createAnimatedIcon(LockIcon, "Lock");
export const MagnifyingGlass = createAnimatedIcon(SearchIcon, "MagnifyingGlass");
export const MapPin = createAnimatedIcon(MapPinIcon, "MapPin");
export const Medal = createAnimatedIcon(MedalIcon, "Medal");
export const Microphone = createAnimatedIcon(MicIcon, "Microphone");
export const Moon = createAnimatedIcon(MoonIcon, "Moon");
export const MoonStars = createAnimatedIcon(MoonStarIcon, "MoonStars");
export const PencilSimple = createAnimatedIcon(PencilIcon, "PencilSimple");
export const Phone = createAnimatedIcon(PhoneIcon, "Phone");
export const Plus = createAnimatedIcon(PlusIcon, "Plus");
export const Printer = createAnimatedIcon(PrinterIcon, "Printer");
export const ShieldCheck = createAnimatedIcon(ShieldCheckIcon, "ShieldCheck");
export const ShieldWarning = createAnimatedIcon(ShieldAlertIcon, "ShieldWarning");
export const SignOut = createAnimatedIcon(LogOutIcon, "SignOut");
export const Smiley = createAnimatedIcon(HugeSmileIcon, "Smiley");
export const Sparkle = createAnimatedIcon(SparklesIcon, "Sparkle");
export const SquaresFour = createAnimatedIcon(LayoutGridIcon, "SquaresFour");
export const Star = createAnimatedIcon(StarIcon, "Star");
export const Stethoscope = createAnimatedIcon(StethoscopeIcon, "Stethoscope");
export const TiktokLogo = createAnimatedIcon(TiktokIcon, "TiktokLogo");
export const Tooth = createAnimatedIcon(AnimatedToothIcon as AnimatedIconComponent, "Tooth");
export const TrendUp = createAnimatedIcon(TrendingUpIcon, "TrendUp");
export const Trash = createAnimatedIcon(TrashIcon, "Trash");
export const UserCheck = createAnimatedIcon(UserCheckIcon, "UserCheck");
export const UserCircle = createAnimatedIcon(UserRoundIcon, "UserCircle");
export const UserMinus = createAnimatedIcon(UserMinusIcon, "UserMinus");
export const Users = createAnimatedIcon(UsersIcon, "Users");
export const UsersFour = createAnimatedIcon(UsersRoundIcon, "UsersFour");
export const UsersThree = createAnimatedIcon(UsersRoundIcon, "UsersThree");
export const WarningCircle = createAnimatedIcon(CircleAlertIcon, "WarningCircle");
export const WhatsappLogo = createAnimatedIcon(WhatsappIcon, "WhatsappLogo");
export const X = createAnimatedIcon(XIcon, "X");
export const XCircle = createAnimatedIcon(CircleXIcon, "XCircle");

export { MorphToggleIcon } from "@/components/ui/MorphToggleIcon";
