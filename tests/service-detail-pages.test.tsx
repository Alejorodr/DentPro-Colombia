import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { ServicesSection } from "@/app/(marketing)/components/Services";
import { HOMEPAGE_DEFAULT_CONTENT } from "@/lib/marketing/homepage-defaults";
import { SERVICE_DETAIL_SLUGS, serviceDetailHref } from "@/lib/marketing/service-detail-pages";
import { SERVICES } from "@/lib/marketing/services-data";

beforeAll(() => {
  // motion usa IntersectionObserver para whileInView; jsdom no lo trae.
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

describe("páginas de detalle de servicios", () => {
  it("la lista del CMS coincide con las páginas que existen en /servicios/[slug]", () => {
    expect([...SERVICE_DETAIL_SLUGS].sort()).toEqual(SERVICES.map((s) => s.slug).sort());
  });

  it("solo arma la ruta para slugs que existen", () => {
    expect(serviceDetailHref("ortodoncia")).toBe("/servicios/ortodoncia");
    expect(serviceDetailHref("no-existe")).toBeNull();
    expect(serviceDetailHref(null)).toBeNull();
    expect(serviceDetailHref("")).toBeNull();
  });

  it("los servicios por defecto enlazan a páginas que existen", () => {
    for (const service of HOMEPAGE_DEFAULT_CONTENT.services.services) {
      expect(service.detailHref).not.toBeNull();
      expect(serviceDetailHref(service.detailHref?.replace("/servicios/", ""))).toBe(service.detailHref);
    }
  });

  it("la tarjeta muestra el enlace al tratamiento solo cuando el servicio tiene página de detalle", () => {
    render(
      <ServicesSection
        title="Servicios"
        description="Descripción"
        services={[
          { id: "a", title: "Valoración ortodoncia", description: "", icon: "Smiley", highlights: [], detailHref: "/servicios/ortodoncia" },
          { id: "b", title: "Limpieza profunda", description: "", icon: "Tooth", highlights: [], detailHref: null },
        ]}
      />,
    );

    const links = screen.getAllByRole("link", { name: /conoce el tratamiento/i });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("href")).toBe("/servicios/ortodoncia");
    expect(screen.getByRole("link", { name: "Valoración ortodoncia" }).getAttribute("href")).toBe("/servicios/ortodoncia");
    expect(screen.queryByRole("link", { name: "Limpieza profunda" })).toBeNull();
  });
});
