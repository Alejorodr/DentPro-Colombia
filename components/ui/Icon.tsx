"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { ComponentType, ForwardRefExoticComponent, ReactNode, RefAttributes, SVGProps } from "react";
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
  CreditCardIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  FilterIcon,
  HeadsetIcon,
  HistoryIcon,
  HouseIcon,
  LayoutGridIcon,
  LockIcon,
  LogInIcon,
  LogOutIcon,
  MailIcon,
  MapPinIcon,
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
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  StarIcon,
  SunIcon,
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
import {
  ArrowDown as LucideArrowDown,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  ArrowUp as LucideArrowUp,
  Award,
  Baby as LucideBaby,
  Bell as LucideBell,
  Calendar as LucideCalendar,
  CalendarCheck as LucideCalendarCheck,
  CalendarPlus as LucideCalendarPlus,
  ChartLine as LucideChartLine,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  CircleAlert,
  CircleCheck as LucideCircleCheck,
  CircleQuestionMark,
  CircleX,
  Clipboard as LucideClipboard,
  Clock as LucideClock,
  Copyright as LucideCopyright,
  CreditCard as LucideCreditCard,
  Diamond,
  Eye as LucideEye,
  EyeOff as LucideEyeOff,
  FileText as LucideFileText,
  Filter as LucideFilter,
  FlaskConical,
  Gem,
  Headset as LucideHeadset,
  History as LucideHistory,
  House as LucideHouse,
  LayoutGrid as LucideLayoutGrid,
  LoaderCircle,
  Lock as LucideLock,
  LogIn as LucideLogIn,
  LogOut as LucideLogOut,
  Mail as LucideMail,
  MapPin as LucideMapPin,
  Medal as LucideMedal,
  Menu as LucideMenu,
  MessageCircleMore as LucideMessageCircleMore,
  Mic as LucideMic,
  Moon as LucideMoon,
  MoonStar as LucideMoonStar,
  Pencil as LucidePencil,
  Phone as LucidePhone,
  Plus as LucidePlus,
  Printer as LucidePrinter,
  Search as LucideSearch,
  Settings as LucideSettings,
  ShieldCheck as LucideShieldCheck,
  ShieldAlert,
  Smile,
  Smartphone as LucideSmartphone,
  Sparkles as LucideSparkles,
  Star as LucideStar,
  Stethoscope as LucideStethoscope,
  Sun as LucideSun,
  Trash as LucideTrash,
  TrendingUp as LucideTrendingUp,
  Upload as LucideUpload,
  UserCheck as LucideUserCheck,
  UserMinus as LucideUserMinus,
  UserRound as LucideUserRound,
  Users as LucideUsers,
  UsersRound as LucideUsersRound,
  X as LucideX,
  XCircle as LucideXCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

type IconWeight = "bold" | "duotone" | "fill" | "light" | "regular" | "thin";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "color" | "ref"> & {
  color?: string;
  duration?: number;
  isAnimated?: boolean;
  mirrored?: boolean;
  nativeAnimation?: boolean;
  size?: number | string;
  weight?: IconWeight;
};

export type IconHandle = {
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

function createAnimatedIcon(
  AnimatedIcon: AnimatedIconComponent,
  LucideIcon: ComponentType<SVGProps<SVGSVGElement>>,
  displayName: string,
): Icon {
  const DentProAnimatedIcon = forwardRef<IconHandle, IconProps>(
    (
      {
        className,
        color,
        duration,
        isAnimated,
        mirrored,
        nativeAnimation,
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
      const ariaHidden = svgProps["aria-hidden"];
      const motionApi = useDentProIconMotion();

      useImperativeHandle(ref, () => ({
        startAnimation: () => {
          motionApi.start();
          iconRef.current?.startAnimation();
        },
        stopAnimation: () => {
          iconRef.current?.stopAnimation();
          motionApi.stop();
        },
      }));

      const handleMouseEnter = (event: unknown) => {
        (onMouseEnter as ((event: unknown) => void) | undefined)?.(event);
        if (isAnimated !== false) {
          motionApi.start();
          if (nativeAnimation) {
            iconRef.current?.startAnimation();
          }
        }
      };

      const handleMouseLeave = (event: unknown) => {
        (onMouseLeave as ((event: unknown) => void) | undefined)?.(event);
        iconRef.current?.stopAnimation();
        motionApi.stop();
      };

      if (!nativeAnimation) {
        return (
          <motion.span
            animate={motionApi.controls}
            className="inline-flex shrink-0 items-center justify-center align-middle"
            initial={false}
            style={{ transformOrigin: "center" }}
          >
            <LucideIcon
              {...svgProps}
              aria-hidden={ariaHidden}
              className={className}
              color={color}
              height={size}
              onMouseEnter={handleMouseEnter as SVGProps<SVGSVGElement>["onMouseEnter"]}
              onMouseLeave={handleMouseLeave as SVGProps<SVGSVGElement>["onMouseLeave"]}
              role={svgProps.role}
              strokeWidth={resolveStrokeWidth(weight)}
              style={{
                transform: mirrored ? "scaleX(-1)" : undefined,
                ...style,
              }}
              width={size}
            />
          </motion.span>
        );
      }

      return (
        <motion.div
          animate={motionApi.controls}
          className="inline-flex shrink-0 items-center justify-center align-middle"
          initial={false}
          style={{ transformOrigin: "center" }}
        >
          <AnimatedIcon
            ref={iconRef}
            aria-hidden={ariaHidden as boolean | "true" | "false" | undefined}
            className={cn("[&>svg]:h-full [&>svg]:w-full", className)}
            color={color}
            duration={duration}
            isAnimated={isAnimated}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role={svgProps.role}
            size={resolveSize(size)}
            style={{
              transform: mirrored ? "scaleX(-1)" : undefined,
              ...style,
            }}
          />
        </motion.div>
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
        nativeAnimation: _nativeAnimation,
        onMouseEnter,
        onMouseLeave,
        size,
        style,
        weight,
        ...props
      },
      ref,
    ) => {
      const motionApi = useDentProIconMotion();

      useImperativeHandle(ref, () => ({
        startAnimation: motionApi.start,
        stopAnimation: motionApi.stop,
      }));

      const handleMouseEnter: SVGProps<SVGSVGElement>["onMouseEnter"] = (event) => {
        onMouseEnter?.(event);
        if (isAnimated !== false) {
          motionApi.start();
        }
      };

      const handleMouseLeave: SVGProps<SVGSVGElement>["onMouseLeave"] = (event) => {
        onMouseLeave?.(event);
        motionApi.stop();
      };

      return (
        <motion.span
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
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
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

function createCustomSvgIcon(
  render: (props: IconProps & { strokeWidth: number }) => ReactNode,
  displayName: string,
): Icon {
  const DentProCustomIcon = forwardRef<IconHandle, IconProps>(
    (
      {
        className,
        color = "currentColor",
        duration: _duration,
        isAnimated,
        mirrored,
        nativeAnimation: _nativeAnimation,
        onMouseEnter,
        onMouseLeave,
        size,
        style,
        weight,
        ...props
      },
      ref,
    ) => {
      const motionApi = useDentProIconMotion();

      useImperativeHandle(ref, () => ({
        startAnimation: motionApi.start,
        stopAnimation: motionApi.stop,
      }));

      const handleMouseEnter: SVGProps<SVGSVGElement>["onMouseEnter"] = (event) => {
        onMouseEnter?.(event);
        if (isAnimated !== false) {
          motionApi.start();
        }
      };

      const handleMouseLeave: SVGProps<SVGSVGElement>["onMouseLeave"] = (event) => {
        onMouseLeave?.(event);
        motionApi.stop();
      };

      return (
        <motion.span
          animate={motionApi.controls}
          className="inline-flex shrink-0 items-center justify-center align-middle"
          initial={false}
          style={{ transformOrigin: "center" }}
        >
          <svg
            {...props}
            className={className}
            fill="none"
            height={size}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: mirrored ? "scaleX(-1)" : undefined,
              ...style,
            }}
            viewBox="0 0 24 24"
            width={size}
            xmlns="http://www.w3.org/2000/svg"
          >
            {render({ ...props, color, size, strokeWidth: resolveStrokeWidth(weight), weight })}
          </svg>
        </motion.span>
      );
    },
  );

  DentProCustomIcon.displayName = displayName;
  return DentProCustomIcon;
}

const ToothFallback = createCustomSvgIcon(
  ({ strokeWidth }) => (
    <>
      <path
        d="M8.6 3.4c1.35 0 2.1.7 3.4.7s2.05-.7 3.4-.7c2.35 0 4 1.9 4 4.52 0 1.8-.7 3.12-1.35 4.25-.72 1.25-1.04 2.5-1.25 3.95-.28 1.9-.78 4.48-2.35 4.48-1.02 0-1.25-1.2-1.6-2.86-.24-1.13-.48-2.35-.85-2.35s-.61 1.22-.85 2.35c-.35 1.66-.58 2.86-1.6 2.86-1.57 0-2.07-2.58-2.35-4.48-.21-1.45-.53-2.7-1.25-3.95C5.3 11.04 4.6 9.72 4.6 7.92c0-2.62 1.65-4.52 4-4.52Z"
        strokeWidth={strokeWidth}
      />
      <path d="M9.3 6.6c.77.38 1.62.58 2.7.58s1.93-.2 2.7-.58" strokeWidth={strokeWidth} />
    </>
  ),
  "Tooth",
);

function createBrandIcon(name: "facebook" | "google" | "instagram" | "linkedin" | "tiktok" | "whatsapp"): Icon {
  const BrandIcon = forwardRef<IconHandle, IconProps>(({
    className,
    color = "currentColor",
    duration: _duration,
    isAnimated,
    mirrored,
    nativeAnimation: _nativeAnimation,
    onMouseEnter,
    onMouseLeave,
    size,
    style,
    weight,
    ...props
  }, ref) => {
    const strokeWidth = resolveStrokeWidth(weight);
    const motionApi = useDentProIconMotion();

    useImperativeHandle(ref, () => ({
      startAnimation: motionApi.start,
      stopAnimation: motionApi.stop,
    }));

    const handleMouseEnter: SVGProps<SVGSVGElement>["onMouseEnter"] = (event) => {
      onMouseEnter?.(event);
      if (isAnimated !== false) {
        motionApi.start();
      }
    };

    const handleMouseLeave: SVGProps<SVGSVGElement>["onMouseLeave"] = (event) => {
      onMouseLeave?.(event);
      motionApi.stop();
    };

    return (
      <motion.span
        animate={motionApi.controls}
        className="inline-flex shrink-0 items-center justify-center align-middle"
        initial={false}
        style={{ transformOrigin: "center" }}
      >
        <svg
          {...props}
          className={className}
          fill="none"
          height={size}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: mirrored ? "scaleX(-1)" : undefined,
            ...style,
          }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          {name === "facebook" ? (
            <path d="M15 8h-2a2 2 0 0 0-2 2v2H9v3h2v6h3v-6h2.2l.8-3H14v-1.6c0-.8.3-1.4 1.3-1.4H17V6.3A9.8 9.8 0 0 0 15 6Z" strokeWidth={strokeWidth} />
          ) : null}
          {name === "instagram" ? (
            <>
              <rect height="16" rx="4" strokeWidth={strokeWidth} width="16" x="4" y="4" />
              <circle cx="12" cy="12" r="3.2" strokeWidth={strokeWidth} />
              <path d="M16.7 7.5h.01" strokeWidth={strokeWidth + 1} />
            </>
          ) : null}
          {name === "google" ? (
            <>
              <path d="M20.2 12.2H12" strokeWidth={strokeWidth} />
              <path d="M17.6 17.3A7.2 7.2 0 1 1 17.7 6.8" strokeWidth={strokeWidth} />
              <path d="M20.2 12.2a7.2 7.2 0 0 1-2.6 5.1" strokeWidth={strokeWidth} />
            </>
          ) : null}
          {name === "linkedin" ? (
            <>
              <path d="M6.5 10.5V18" strokeWidth={strokeWidth} />
              <path d="M10.5 18v-4.15a3.35 3.35 0 0 1 6.7 0V18" strokeWidth={strokeWidth} />
              <path d="M10.5 10.5V18" strokeWidth={strokeWidth} />
              <path d="M6.5 6.5h.01" strokeWidth={strokeWidth + 1} />
              <rect height="18" rx="2.8" strokeWidth={strokeWidth} width="18" x="3" y="3" />
            </>
          ) : null}
          {name === "tiktok" ? (
            <>
              <path d="M14 4v10.1a4.1 4.1 0 1 1-3.3-4" strokeWidth={strokeWidth} />
              <path d="M14 4c.7 2.9 2.35 4.55 5 5" strokeWidth={strokeWidth} />
            </>
          ) : null}
          {name === "whatsapp" ? (
            <>
              <path d="M4.7 19.3 6 15.9a7.4 7.4 0 1 1 2.2 2.1Z" strokeWidth={strokeWidth} />
              <path d="M9.5 8.8c.25-.28.55-.26.76.04l.82 1.16c.18.26.14.6-.1.82l-.34.33c.54 1.02 1.36 1.83 2.4 2.36l.35-.34c.24-.23.56-.27.82-.08l1.15.82c.3.21.32.52.05.77-.54.52-1.18.78-1.9.6-2.34-.56-4.2-2.38-4.8-4.72-.18-.72.1-1.36.78-1.76Z" strokeWidth={strokeWidth} />
            </>
          ) : null}
        </svg>
      </motion.span>
    );
  });

  BrandIcon.displayName = `${name[0].toUpperCase()}${name.slice(1)}Logo`;
  return BrandIcon;
}

export const ArrowLeft = createAnimatedIcon(ArrowLeftIcon, LucideArrowLeft, "ArrowLeft");
export const ArrowRight = createAnimatedIcon(ArrowRightIcon, LucideArrowRight, "ArrowRight");
export const ArrowDown = createAnimatedIcon(ArrowDownIcon, LucideArrowDown, "ArrowDown");
export const ArrowUp = createAnimatedIcon(ArrowUpIcon, LucideArrowUp, "ArrowUp");
export const Baby = createLucideIcon(LucideBaby, "Baby");
export const Bell = createAnimatedIcon(BellIcon, LucideBell, "Bell");
export const CalendarBlank = createAnimatedIcon(CalendarIcon, LucideCalendar, "CalendarBlank");
export const CalendarCheck = createAnimatedIcon(CalendarCheckIcon, LucideCalendarCheck, "CalendarCheck");
export const CalendarPlus = createAnimatedIcon(CalendarPlusIcon, LucideCalendarPlus, "CalendarPlus");
export const CaretLeft = createAnimatedIcon(ChevronLeftIcon, LucideChevronLeft, "CaretLeft");
export const CaretRight = createAnimatedIcon(ChevronRightIcon, LucideChevronRight, "CaretRight");
export const ChartLineUp = createAnimatedIcon(ChartLineIcon, LucideChartLine, "ChartLineUp");
export const ChatCircleDots = createAnimatedIcon(MessageCircleMoreIcon, LucideMessageCircleMore, "ChatCircleDots");
export const CheckCircle = createAnimatedIcon(CircleCheckIcon, LucideCircleCheck, "CheckCircle");
export const CircleNotch = createLucideIcon(LoaderCircle, "CircleNotch");
export const ClipboardText = createAnimatedIcon(ClipboardIcon, LucideClipboard, "ClipboardText");
export const ClockCounterClockwise = createAnimatedIcon(HistoryIcon, LucideHistory, "ClockCounterClockwise");
export const Clock = createAnimatedIcon(ClockIcon, LucideClock, "Clock");
export const Copyright = createLucideIcon(LucideCopyright, "Copyright");
export const CreditCard = createAnimatedIcon(CreditCardIcon, LucideCreditCard, "CreditCard");
export const DiamondsFour = createLucideIcon(Diamond, "DiamondsFour");
export const EnvelopeSimple = createAnimatedIcon(MailIcon, LucideMail, "EnvelopeSimple");
export const DeviceMobile = createAnimatedIcon(SmartphoneIcon, LucideSmartphone, "DeviceMobile");
export const Eye = createAnimatedIcon(EyeIcon, LucideEye, "Eye");
export const EyeSlash = createAnimatedIcon(EyeOffIcon, LucideEyeOff, "EyeSlash");
export const FacebookLogo = createBrandIcon("facebook");
export const GoogleLogo = createBrandIcon("google");
export const FileArrowUp = createAnimatedIcon(UploadIcon, LucideUpload, "FileArrowUp");
export const FileText = createAnimatedIcon(FileTextIcon, LucideFileText, "FileText");
export const Flask = createLucideIcon(FlaskConical, "Flask");
export const Funnel = createAnimatedIcon(FilterIcon, LucideFilter, "Funnel");
export const Gear = createAnimatedIcon(SettingsIcon, LucideSettings, "Gear");
export const Headset = createAnimatedIcon(HeadsetIcon, LucideHeadset, "Headset");
export const House = createAnimatedIcon(HouseIcon, LucideHouse, "House");
export const InstagramLogo = createBrandIcon("instagram");
export const LinkedinLogo = createBrandIcon("linkedin");
export const List = createAnimatedIcon(MenuIcon, LucideMenu, "List");
export const Lock = createAnimatedIcon(LockIcon, LucideLock, "Lock");
export const MagnifyingGlass = createAnimatedIcon(SearchIcon, LucideSearch, "MagnifyingGlass");
export const MapPin = createAnimatedIcon(MapPinIcon, LucideMapPin, "MapPin");
export const Medal = createLucideIcon(LucideMedal ?? Award, "Medal");
export const Microphone = createAnimatedIcon(MicIcon, LucideMic, "Microphone");
export const Moon = createAnimatedIcon(MoonIcon, LucideMoon, "Moon");
export const MoonStars = createAnimatedIcon(MoonStarIcon, LucideMoonStar, "MoonStars");
export const PencilSimple = createAnimatedIcon(PencilIcon, LucidePencil, "PencilSimple");
export const Phone = createAnimatedIcon(PhoneIcon, LucidePhone, "Phone");
export const Plus = createAnimatedIcon(PlusIcon, LucidePlus, "Plus");
export const Printer = createAnimatedIcon(PrinterIcon, LucidePrinter, "Printer");
export const Question = createLucideIcon(CircleQuestionMark, "Question");
export const ShieldCheck = createAnimatedIcon(ShieldCheckIcon, LucideShieldCheck, "ShieldCheck");
export const ShieldWarning = createLucideIcon(ShieldAlert, "ShieldWarning");
export const SignIn = createAnimatedIcon(LogInIcon, LucideLogIn, "SignIn");
export const SignOut = createAnimatedIcon(LogOutIcon, LucideLogOut, "SignOut");
export const Smiley = createLucideIcon(Smile, "Smiley");
export const Sparkle = createAnimatedIcon(SparklesIcon, LucideSparkles, "Sparkle");
export const SquaresFour = createAnimatedIcon(LayoutGridIcon, LucideLayoutGrid, "SquaresFour");
export const Star = createAnimatedIcon(StarIcon, LucideStar, "Star");
export const Stethoscope = createLucideIcon(LucideStethoscope, "Stethoscope");
export const Sun = createAnimatedIcon(SunIcon, LucideSun, "Sun");
export const TiktokLogo = createBrandIcon("tiktok");
export const Tooth = ToothFallback;
export const TrendUp = createAnimatedIcon(TrendingUpIcon, LucideTrendingUp, "TrendUp");
export const Trash = createAnimatedIcon(TrashIcon, LucideTrash, "Trash");
export const UserCheck = createAnimatedIcon(UserCheckIcon, LucideUserCheck, "UserCheck");
export const UserCircle = createAnimatedIcon(UserRoundIcon, LucideUserRound, "UserCircle");
export const UserMinus = createAnimatedIcon(UserMinusIcon, LucideUserMinus, "UserMinus");
export const Users = createAnimatedIcon(UsersIcon, LucideUsers, "Users");
export const UsersFour = createAnimatedIcon(UsersRoundIcon, LucideUsersRound, "UsersFour");
export const UsersThree = createAnimatedIcon(UsersRoundIcon, LucideUsersRound, "UsersThree");
export const WarningCircle = createLucideIcon(CircleAlert, "WarningCircle");
export const WhatsappLogo = createBrandIcon("whatsapp");
export const X = createAnimatedIcon(XIcon, LucideX, "X");
export const XCircle = createLucideIcon(CircleX ?? LucideXCircle, "XCircle");
export const GemIcon = createLucideIcon(Gem, "GemIcon");
