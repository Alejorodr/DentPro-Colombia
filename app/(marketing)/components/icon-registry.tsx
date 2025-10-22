"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  Baby,
  CalendarCheck,
  ChartLineUp,
  ChatCircleDots,
  Clock,
  CreditCard,
  DiamondsFour,
  EnvelopeSimple,
  FacebookLogo,
  Headset,
  InstagramLogo,
  LinkedinLogo,
  MapPin,
  Medal,
  Phone,
  ShieldCheck,
  Smiley,
  Sparkle,
  Stethoscope,
  Tooth,
  UsersThree,
  WhatsappLogo,
} from "@phosphor-icons/react";

import type { MarketingIconName } from "./icon-types";

const ICON_COMPONENTS: Record<MarketingIconName, Icon> = {
  Baby,
  CalendarCheck,
  ChartLineUp,
  ChatCircleDots,
  Clock,
  CreditCard,
  DiamondsFour,
  EnvelopeSimple,
  FacebookLogo,
  Headset,
  InstagramLogo,
  LinkedinLogo,
  MapPin,
  Medal,
  Phone,
  ShieldCheck,
  Smiley,
  Sparkle,
  Stethoscope,
  Tooth,
  UsersThree,
  WhatsappLogo,
};

export function resolveMarketingIcon(name: MarketingIconName): Icon {
  return ICON_COMPONENTS[name];
}
