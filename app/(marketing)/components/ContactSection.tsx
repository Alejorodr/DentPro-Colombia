"use client";

import { Copyright } from "@/components/ui/Icon";

import type { MarketingIconName } from "./icon-types";
import { resolveMarketingIcon } from "./icon-registry";

interface ContactChannel {
  icon: MarketingIconName;
  label: string;
  value: string;
  href?: string;
}

interface SocialLink {
  href: string;
  label: string;
  icon: MarketingIconName;
}

interface ServiceSupportItem {
  icon: MarketingIconName;
  text: string;
}

interface LocationItem {
  name: string;
  description: string;
}

interface LegalLink {
  href: string;
  label: string;
}

interface ContactSectionProps {
  title: string;
  description: string;
  channels: ContactChannel[];
  socials: SocialLink[];
  supportTitle: string;
  supportItems: ServiceSupportItem[];
  locationsTitle: string;
  locations: LocationItem[];
  legalLinks: LegalLink[];
  brand: string;
  mapEmbed?: string;
}

export function ContactSection({
  title,
  description,
  channels,
  socials,
  supportTitle,
  supportItems,
  locationsTitle,
  locations,
  legalLinks,
  brand,
  mapEmbed,
}: ContactSectionProps) {
  const currentYear = new Date().getFullYear();

  return (
    <section id="contacto" className="bg-slate-900 py-20 text-white transition-colors duration-500 dark:bg-surface-base">
      <div className="container mx-auto grid gap-12 px-6 lg:grid-cols-3">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className="text-base text-slate-300">{description}</p>
          <div className="space-y-2 text-sm text-slate-300">
            {channels.map((channel) => {
              const ChannelIcon = resolveMarketingIcon(channel.icon);

              return (
                <p key={channel.label} className="flex items-center gap-3">
                  <span className="icon-badge text-brand-light dark:text-accent-cyan">
                    <ChannelIcon className="h-5 w-5" weight="bold" aria-hidden="true" />
                  </span>
                  {channel.href ? (
                    <a href={channel.href} className="hover:text-white dark:hover:text-accent-cyan">
                      {channel.value}
                    </a>
                  ) : (
                    channel.value
                  )}
                </p>
              );
            })}
          </div>
          <div className="flex gap-4">
            {socials.map((social) => {
              const SocialIcon = resolveMarketingIcon(social.icon);

              return (
                <a
                  key={social.href}
                  href={social.href}
                  className="social-link dark:border-accent-cyan/40 dark:text-accent-cyan"
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener"
                >
                  <SocialIcon className="h-5 w-5" weight="fill" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </div>
        <div className="rounded-3xl bg-white/10 p-8 backdrop-blur-sm transition-colors duration-300 dark:border dark:border-accent-cyan/10 dark:bg-surface-muted/80">
          <h3 className="text-xl font-semibold">{supportTitle}</h3>
          <p className="mt-2 text-sm text-slate-300">
            Nuestro equipo de Patient Care está listo para acompañarte antes, durante y después de cada visita.
          </p>
          <ul className="mt-6 space-y-4 text-sm text-slate-200">
            {supportItems.map((item) => {
              const SupportIcon = resolveMarketingIcon(item.icon);

              return (
                <li key={item.text} className="flex gap-3">
                  <span className="icon-badge text-brand-light dark:text-accent-cyan">
                    <SupportIcon className="h-5 w-5" weight="bold" aria-hidden="true" />
                  </span>
                  {item.text}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-3xl bg-white/10 p-8 backdrop-blur-sm transition-colors duration-300 dark:border dark:border-accent-cyan/10 dark:bg-surface-muted/80">
          <h3 className="text-xl font-semibold">{locationsTitle}</h3>
          <ul className="mt-6 space-y-4 text-sm text-slate-200">
            {locations.map((location) => (
              <li key={location.name}>
                <p className="font-semibold text-white">{location.name}</p>
                <p>{location.description}</p>
              </li>
            ))}
          </ul>
          {mapEmbed ? (
            <div className="contact-map mt-8">
              <div
                className="aspect-4/3"
                dangerouslySetInnerHTML={{ __html: mapEmbed }}
              />
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-20 border-t border-white/10 dark:border-surface-muted/80">
        <div className="container mx-auto flex flex-col gap-4 px-6 py-8 text-sm text-slate-400 transition-colors duration-300 dark:text-slate-500 md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white dark:bg-surface-muted/50">
              <Copyright className="h-4 w-4" weight="bold" aria-hidden="true" />
            </span>
            <span>
              {currentYear} {brand}. Todos los derechos reservados.
            </span>
          </p>
          <div className="flex gap-6">
            {legalLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-white dark:hover:text-accent-cyan">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

