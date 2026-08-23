import type { MarketingIconName } from "./icon-types";
import { resolveMarketingIcon } from "./icon-registry";
import { Star } from "@/components/ui/Icon";
import { buildEmailHref, buildPhoneHref, buildWhatsappHref } from "@/lib/marketing/homepage-adapter";

type IconText = {
  text: string;
  icon: MarketingIconName;
};

type ChannelType = "WHATSAPP" | "PHONE" | "EMAIL";

type Channel = {
  id: string;
  type: ChannelType;
  value: string;
  label: string;
};

type SocialLink = {
  href: string;
  label: string;
  icon: MarketingIconName;
};

interface GoogleRatingBadge {
  rating: number;
  count: number;
  url?: string;
}

interface InfoBarProps {
  location: IconText;
  schedule: IconText;
  channels: Channel[];
  socials: SocialLink[];
  googleRating?: GoogleRatingBadge;
}

const CHANNEL_ICON: Record<ChannelType, MarketingIconName> = {
  WHATSAPP: "ChatCircleDots",
  PHONE: "Phone",
  EMAIL: "EnvelopeSimple",
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

export function InfoBar({ location, schedule, channels, socials, googleRating }: InfoBarProps) {
  const LocationIcon = resolveMarketingIcon(location.icon);
  const ScheduleIcon = resolveMarketingIcon(schedule.icon);

  return (
    <div className="border-b border-white/60 bg-white/80 text-sm text-slate-600 backdrop-blur-xs transition-colors duration-300 dark:border-surface-muted/60 dark:bg-surface-base/90 dark:text-slate-200">
      <div className="container mx-auto flex flex-col gap-3 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-light/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-indigo shadow-xs dark:bg-surface-muted/80 dark:text-accent-cyan">
            <LocationIcon className="h-4 w-4" weight="fill" aria-hidden="true" />
            {location.text}
          </span>
          <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-300">
            <ScheduleIcon className="h-4 w-4" weight="fill" aria-hidden="true" />
            {schedule.text}
          </span>
          {googleRating ? (
            googleRating.url ? (
              <a
                href={googleRating.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-light/80 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-brand-light dark:bg-surface-muted/80 dark:text-slate-200 dark:hover:bg-surface-muted"
                aria-label={`${googleRating.rating.toFixed(1)} de 5 en Google — ${googleRating.count} reseñas`}
              >
                <Star className="h-3.5 w-3.5 text-gold-bright" weight="fill" aria-hidden="true" />
                {googleRating.rating.toFixed(1)}
                <span className="text-slate-400 dark:text-slate-500">·</span>
                {googleRating.count.toLocaleString("es-CO")} en Google
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-surface-muted/80 dark:text-slate-200">
                <Star className="h-3.5 w-3.5 text-gold-bright" weight="fill" aria-hidden="true" />
                {googleRating.rating.toFixed(1)}
                <span className="text-slate-400 dark:text-slate-500">·</span>
                {googleRating.count.toLocaleString("es-CO")} en Google
              </span>
            )
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 text-slate-400">
          {channels.map((channel) => {
            const ChannelIcon = resolveMarketingIcon(CHANNEL_ICON[channel.type]);
            const isWhatsapp = channel.type === "WHATSAPP";

              if (channel.type === "EMAIL") {
                return (
                  <a
                    key={channel.id}
                    href={buildChannelHref(channel)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 text-lg transition hover:-translate-y-0.5 hover:border-brand-teal hover:text-brand-teal dark:border-surface-muted/80 dark:text-slate-200 dark:hover:border-accent-cyan dark:hover:text-accent-cyan"
                    aria-label={channel.label}
                  >
                    <ChannelIcon className="h-5 w-5" weight="fill" aria-hidden="true" />
                  </a>
                );
              }

              return (
                <a
                  key={channel.id}
                  href={buildChannelHref(channel)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-brand-teal hover:text-brand-teal dark:border-surface-muted/80 dark:text-slate-200 dark:hover:border-accent-cyan dark:hover:text-accent-cyan"
                  target={isWhatsapp ? "_blank" : undefined}
                  rel={isWhatsapp ? "noopener" : undefined}
                >
                  <ChannelIcon className="h-4 w-4" weight="fill" aria-hidden="true" />
                  {channel.label}
                </a>
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-slate-400">
          {socials.map((social) => {
            const SocialIcon = resolveMarketingIcon(social.icon);

              return (
                <a
                  key={social.href}
                  href={social.href}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 text-lg transition hover:-translate-y-0.5 hover:border-brand-teal hover:text-brand-teal dark:border-surface-muted/80 dark:text-slate-200 dark:hover:border-accent-cyan dark:hover:text-accent-cyan"
                  target="_blank"
                  rel="noopener"
                  aria-label={social.label}
                >
                  <SocialIcon className="h-5 w-5" weight="fill" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

