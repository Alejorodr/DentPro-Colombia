"use client";

import type { MarketingIconName } from "./icon-types";
import { resolveMarketingIcon } from "./icon-registry";
import { buildEmailHref, buildPhoneHref, buildWhatsappHref } from "@/lib/marketing/homepage-adapter";

type ChannelType = "WHATSAPP" | "PHONE" | "EMAIL";

interface Channel {
  id: string;
  type: ChannelType;
  value: string;
  label: string;
}

interface SocialLink {
  href: string;
  label: string;
  icon: MarketingIconName;
}

interface FloatingActionsProps {
  channels: Channel[];
  socials: SocialLink[];
}

const CHANNEL_ICON: Record<ChannelType, MarketingIconName> = {
  WHATSAPP: "ChatCircleDots",
  PHONE: "Phone",
  EMAIL: "EnvelopeSimple",
};

const CHANNEL_LABEL_FALLBACK: Record<ChannelType, string> = {
  WHATSAPP: "Chat en WhatsApp",
  PHONE: "Llamar a DentPro",
  EMAIL: "Escríbenos por correo",
};

function buildChannelHref(channel: Channel): string {
  switch (channel.type) {
    case "WHATSAPP":
      return buildWhatsappHref(channel.value);
    case "PHONE":
      return buildPhoneHref(channel.value);
    case "EMAIL":
      return buildEmailHref(channel.value);
  }
}

const CalendarCheckIcon = resolveMarketingIcon("CalendarCheck");

export function FloatingActions({ channels, socials }: FloatingActionsProps) {
  return (
    <div className="floating-actions" role="region" aria-label="Accesos rápidos">
      {channels.map((channel) => {
        const ChannelIcon = resolveMarketingIcon(CHANNEL_ICON[channel.type]);
        const isWhatsapp = channel.type === "WHATSAPP";

        return (
          <a
            key={channel.id}
            href={buildChannelHref(channel)}
            className="group relative floating-action-btn"
            aria-label={channel.label || CHANNEL_LABEL_FALLBACK[channel.type]}
            target={isWhatsapp ? "_blank" : undefined}
            rel={isWhatsapp ? "noopener noreferrer" : undefined}
          >
            <ChannelIcon className="h-6 w-6" weight="bold" aria-hidden="true" />
            <span className="pointer-events-none absolute right-[calc(100%+0.75rem)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-slate-900/90 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 dark:bg-surface-elevated/95 dark:text-slate-100">
              {channel.label || CHANNEL_LABEL_FALLBACK[channel.type]}
            </span>
          </a>
        );
      })}
      {socials.map((social) => {
        const SocialIcon = resolveMarketingIcon(social.icon);

        return (
          <a
            key={social.href}
            href={social.href}
            className="group relative floating-action-btn"
            aria-label={social.label}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SocialIcon className="h-6 w-6" weight="bold" aria-hidden="true" />
            <span className="pointer-events-none absolute right-[calc(100%+0.75rem)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-slate-900/90 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 dark:bg-surface-elevated/95 dark:text-slate-100">
              {social.label}
            </span>
          </a>
        );
      })}
      <a
        href="#agenda"
        className="group relative floating-action-btn"
        aria-label="Ir a agenda"
      >
        <CalendarCheckIcon className="h-6 w-6" weight="bold" aria-hidden="true" />
        <span className="pointer-events-none absolute right-[calc(100%+0.75rem)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-slate-900/90 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 dark:bg-surface-elevated/95 dark:text-slate-100">
          Ir a agenda
        </span>
      </a>
    </div>
  );
}

