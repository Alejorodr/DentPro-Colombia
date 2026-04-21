"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type HomepageSettingsForm = {
  infoBarLocation: string;
  infoBarHours: string;
  infoBarWhatsappHref: string;
  infoBarWhatsappLabel: string;
  infoBarEmailHref: string;
  infoBarEmailLabel: string;
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  heroPrimaryButtonText: string;
  heroPrimaryButtonHref: string;
  heroSecondaryButtonText: string;
  heroSecondaryButtonHref: string;
  heroImageUrl: string;
  heroImageAlt: string;
  heroTestimonialQuote: string;
  heroTestimonialAuthor: string;
  heroTestimonialRole: string;
  heroTestimonialAvatarUrl: string;
  heroHighlightTitle: string;
  heroHighlightDescription: string;
  bookingTitle: string;
  bookingDescription: string;
  bookingSelectLabel: string;
  bookingBenefitsTitle: string;
  bookingScheduleNote: string;
  bookingConsentNote: string;
  contactTitle: string;
  contactDescription: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactEmail: string;
  contactAddress: string;
  contactSupportTitle: string;
  contactLocationsTitle: string;
  contactBrand: string;
  contactMapEmbedUrl: string;
  floatingWhatsappNumber: string;
  floatingPhoneNumber: string;
};

type ApiResponse = {
  settings?: Partial<Record<keyof HomepageSettingsForm, string | null>>;
  error?: string;
  details?: Array<{ path: string; message: string }>;
};

const EMPTY_FORM: HomepageSettingsForm = {
  infoBarLocation: "",
  infoBarHours: "",
  infoBarWhatsappHref: "",
  infoBarWhatsappLabel: "",
  infoBarEmailHref: "",
  infoBarEmailLabel: "",
  heroBadge: "",
  heroTitle: "",
  heroDescription: "",
  heroPrimaryButtonText: "",
  heroPrimaryButtonHref: "",
  heroSecondaryButtonText: "",
  heroSecondaryButtonHref: "",
  heroImageUrl: "",
  heroImageAlt: "",
  heroTestimonialQuote: "",
  heroTestimonialAuthor: "",
  heroTestimonialRole: "",
  heroTestimonialAvatarUrl: "",
  heroHighlightTitle: "",
  heroHighlightDescription: "",
  bookingTitle: "",
  bookingDescription: "",
  bookingSelectLabel: "",
  bookingBenefitsTitle: "",
  bookingScheduleNote: "",
  bookingConsentNote: "",
  contactTitle: "",
  contactDescription: "",
  contactPhone: "",
  contactWhatsapp: "",
  contactEmail: "",
  contactAddress: "",
  contactSupportTitle: "",
  contactLocationsTitle: "",
  contactBrand: "",
  contactMapEmbedUrl: "",
  floatingWhatsappNumber: "",
  floatingPhoneNumber: "",
};

type FieldConfig = {
  key: keyof HomepageSettingsForm;
  label: string;
  placeholder?: string;
  type?: "text" | "url" | "email";
  multiline?: boolean;
  helperText?: string;
};

type SectionConfig = {
  title: string;
  description: string;
  fields: FieldConfig[];
};

const SECTIONS: SectionConfig[] = [
  {
    title: "Información superior",
    description: "Contenido del InfoBar visible en la parte superior del homepage.",
    fields: [
      { key: "infoBarLocation", label: "Ubicación", placeholder: "Cra. 7 #13-180, Chía" },
      { key: "infoBarHours", label: "Horario", placeholder: "Lun–Sáb 8:00-19:00" },
      { key: "infoBarWhatsappHref", label: "WhatsApp href", type: "url", placeholder: "https://wa.me/573..." },
      { key: "infoBarWhatsappLabel", label: "WhatsApp label", placeholder: "Agenda por WhatsApp" },
      { key: "infoBarEmailHref", label: "Email href", type: "text", placeholder: "mailto:correo@dominio.com" },
      { key: "infoBarEmailLabel", label: "Email label", placeholder: "correo@dominio.com" },
    ],
  },
  {
    title: "Hero principal",
    description: "Bloque principal de portada (badge, CTAs, imagen, testimonio y highlight).",
    fields: [
      { key: "heroBadge", label: "Badge" },
      { key: "heroTitle", label: "Título" },
      { key: "heroDescription", label: "Descripción", multiline: true },
      { key: "heroPrimaryButtonText", label: "Botón primario (texto)" },
      { key: "heroPrimaryButtonHref", label: "Botón primario (href)", placeholder: "#agenda o https://..." },
      { key: "heroSecondaryButtonText", label: "Botón secundario (texto)" },
      { key: "heroSecondaryButtonHref", label: "Botón secundario (href)", placeholder: "#agenda o https://..." },
      { key: "heroImageUrl", label: "URL imagen hero", type: "url" },
      { key: "heroImageAlt", label: "Alt imagen hero" },
      { key: "heroTestimonialQuote", label: "Testimonio (quote)", multiline: true },
      { key: "heroTestimonialAuthor", label: "Testimonio (autor)" },
      { key: "heroTestimonialRole", label: "Testimonio (rol)" },
      { key: "heroTestimonialAvatarUrl", label: "URL avatar testimonio", type: "url" },
      { key: "heroHighlightTitle", label: "Highlight título" },
      { key: "heroHighlightDescription", label: "Highlight descripción", multiline: true },
    ],
  },
  {
    title: "Agenda",
    description: "Textos de apoyo del bloque de agendamiento.",
    fields: [
      { key: "bookingTitle", label: "Título" },
      { key: "bookingDescription", label: "Descripción", multiline: true },
      { key: "bookingSelectLabel", label: "Etiqueta del selector" },
      { key: "bookingBenefitsTitle", label: "Título beneficios" },
      { key: "bookingScheduleNote", label: "Nota de horario", multiline: true },
      { key: "bookingConsentNote", label: "Nota de consentimiento", multiline: true },
    ],
  },
  {
    title: "Contacto",
    description: "Canales y encabezados del bloque de contacto.",
    fields: [
      { key: "contactTitle", label: "Título" },
      { key: "contactDescription", label: "Descripción", multiline: true },
      { key: "contactPhone", label: "Teléfono" },
      {
        key: "contactWhatsapp",
        label: "WhatsApp (bloque contacto)",
        helperText: "Este campo afecta el texto del bloque de contacto, no el botón flotante.",
      },
      { key: "contactEmail", label: "Email", type: "email" },
      { key: "contactAddress", label: "Dirección" },
      { key: "contactSupportTitle", label: "Título soporte" },
      { key: "contactLocationsTitle", label: "Título ubicaciones" },
      { key: "contactBrand", label: "Marca de firma" },
      {
        key: "contactMapEmbedUrl",
        label: "URL mapa (solo HTTPS)",
        type: "url",
        helperText: "Se guarda como URL controlada; no se admite HTML embed.",
      },
    ],
  },
  {
    title: "Acciones flotantes",
    description: "Datos usados por los botones flotantes del homepage.",
    fields: [
      {
        key: "floatingWhatsappNumber",
        label: "Número WhatsApp flotante",
        helperText: "Este número impacta el botón flotante de WhatsApp.",
      },
      { key: "floatingPhoneNumber", label: "Número teléfono flotante" },
    ],
  },
];

function normalizeForm(input: Partial<Record<keyof HomepageSettingsForm, string | null>>): HomepageSettingsForm {
  const output = { ...EMPTY_FORM };
  for (const key of Object.keys(output) as Array<keyof HomepageSettingsForm>) {
    output[key] = input[key] ?? "";
  }
  return output;
}

export function AdminHomepageSettingsPanel() {
  const [form, setForm] = useState<HomepageSettingsForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetchWithRetry("/api/admin/homepage/settings");
    const body = (await response.json().catch(() => null)) as ApiResponse | null;

    if (!response.ok || !body?.settings) {
      setError(body?.error ?? "No se pudo cargar la configuración del homepage.");
      setLoading(false);
      return;
    }

    setForm(normalizeForm(body.settings));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const validationMessage = useMemo(() => {
    if (!error) {
      return null;
    }
    return error;
  }, [error]);

  const onChange = (key: keyof HomepageSettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    const response = await fetchWithTimeout("/api/admin/homepage/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const body = (await response.json().catch(() => null)) as ApiResponse | null;

    if (!response.ok) {
      const detail = body?.details?.[0]?.message;
      setError(detail ?? body?.error ?? "No se pudieron guardar los cambios.");
      setSaving(false);
      return;
    }

    setForm(normalizeForm(body?.settings ?? form));
    setSuccess("Cambios guardados correctamente.");
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Homepage CMS</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Configuración singleton del homepage</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Fase 3A: edición de bloques singleton (InfoBar, Hero, Agenda, Contacto y acciones flotantes).
        </p>
      </section>

      {loading ? <Card><p className="text-sm text-slate-600 dark:text-slate-300">Cargando configuración...</p></Card> : null}

      {!loading
        ? SECTIONS.map((section) => (
            <Card key={section.title} className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{section.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{section.description}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {section.fields.map((field) => (
                  <label key={field.key} className={field.multiline ? "space-y-1 md:col-span-2" : "space-y-1"}>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {field.label}
                    </span>
                    {field.multiline ? (
                      <textarea
                        className="input min-h-28 text-sm"
                        value={form[field.key]}
                        onChange={(event) => onChange(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        disabled={saving}
                      />
                    ) : (
                      <input
                        className="input h-11 text-sm"
                        value={form[field.key]}
                        onChange={(event) => onChange(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        type={field.type ?? "text"}
                        disabled={saving}
                      />
                    )}
                    {field.helperText ? <p className="text-xs text-slate-500 dark:text-slate-400">{field.helperText}</p> : null}
                  </label>
                ))}
              </div>
            </Card>
          ))
        : null}

      <Card className="space-y-3">
        <button
          type="button"
          className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSave}
          disabled={loading || saving}
        >
          {saving ? "Guardando..." : "Guardar homepage"}
        </button>
        {validationMessage ? <p className="text-sm text-red-600">{validationMessage}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      </Card>
    </div>
  );
}
